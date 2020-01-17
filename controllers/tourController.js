// const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');
const Tour = require('./../models/tourModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');

// const tours = JSON.parse(
//     fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`)
// );

const multerStorage = multer.memoryStorage();
const multerFilter = (req, file, callback) => {
    if (file.mimetype.startsWith('image')) {
        callback(null, true);
    } else {
        callback(
            new AppError('Not an image! Please upload only images.', 400),
            false
        );
    }
};
// multer config to upload images
const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter
});

exports.uploadTourImages = upload.fields([
    {
        name: 'imageCover',
        maxCount: 1
    },
    { name: 'images', maxCount: 3 }
]);

exports.processTourImages = catchAsync(async (req, res, next) => {
    console.log(req);
    if (!req.files.imageCover || !req.files.images) next();

    req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;

    await sharp(req.files.imageCover[0].buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`./public/img/tours/${req.body.imageCover}`);

    req.body.images = [];
    await Promise.all(
        req.files.images.map((file, i) => {
            const filename = `tour-${req.params.id}-${Date.now()}-${i +
                1}.jpeg`;
            req.body.images.push(filename);

            return sharp(file.buffer)
                .resize(2000, 1333)
                .toFormat('jpeg')
                .jpeg({ quality: 90 })
                .toFile(`./public/img/tours/${filename}`);
        })
    );
    next();
});
exports.aliasTopTours = (req, res, next) => {
    req.query.limit = '5';
    req.query.sort = '-ratingsAverage,price';
    req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
    next();
};

exports.getAllTours = factory.getAll(Tour);
exports.createTour = factory.createOne(Tour);
exports.getTour = factory.getOne(Tour, 'reviews');
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);

exports.getStats = catchAsync(async (req, res) => {
    const stats = await Tour.aggregate([
        {
            $match: { ratingsAverage: { $gte: 4.5 } }
        },
        {
            $group: {
                _id: { $toUpper: '$difficulty' },
                numTours: { $sum: 1 },
                avgPrice: { $avg: '$price' },
                avgRatings: { $avg: '$ratingsAverage' },
                totalRatings: { $sum: '$ratingsQuantity' },
                minPrice: { $min: '$price' },
                maxPrice: { $max: '$price' }
            }
        },
        {
            $sort: { avgRatings: -1 }
        }
    ]);

    res.status(200).json({
        status: 'success',
        results: stats.length,
        data: {
            stats
        }
    });
});

exports.getMonthlyPlan = catchAsync(async (req, res) => {
    const year = req.params.year * 1;
    const plan = await Tour.aggregate([
        {
            $unwind: '$startDates'
        },
        {
            $match: {
                startDates: {
                    $gte: new Date(`${year}-01-01`),
                    $lte: new Date(`${year}-12-31`)
                }
            }
        },
        {
            $group: {
                _id: { $month: '$startDates' },
                numTour: { $sum: 1 },
                tours: { $push: '$name' }
            }
        },
        {
            $addFields: { month: '$_id' }
        },
        {
            $project: { _id: 0 }
        },
        {
            $sort: { numTour: -1 }
        },
        {
            $limit: 6
        }
    ]);
    res.status(200).json({
        status: 'success',
        results: plan.length,
        data: {
            plan
        }
    });
});

// /tours-within/300/centre/34.122203,-118.304689/unit/mi
exports.getToursWithin = catchAsync(async (req, res, next) => {
    const { distance, latlng, unit } = req.params;
    const [lat, lng] = latlng.split(',');

    if (!lat || !lng) {
        next(
            new AppError(
                'please provide lattitude and longitude or give access to your location',
                400
            )
        );
    }

    const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

    const results = await Tour.find({
        startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
    });

    res.status(200).json({
        status: 'success',
        results: results.length,
        data: {
            data: results
        }
    });
});

exports.getDistances = catchAsync(async (req, res, next) => {
    const { latlng, unit } = req.params;
    const [lat, lng] = latlng.split(',');

    if (!lat || !lng) {
        next(
            new AppError(
                'please provide lattitude and longitude or give access to your location',
                400
            )
        );
    }

    const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

    const results = await Tour.aggregate([
        {
            $geoNear: {
                near: {
                    type: 'Point',
                    coordinates: [lng * 1, lat * 1]
                },
                distanceField: 'distance',
                distanceMultiplier: multiplier
            }
        },
        {
            $project: {
                distance: 1,
                name: 1
            }
        }
    ]);

    res.status(200).json({
        status: 'success',
        results: results.length,
        data: {
            data: results
        }
    });
});
