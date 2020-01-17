const multer = require('multer');
const sharp = require('sharp');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');

// const multerStorage = multer.diskStorage({
//     destination: (req, file, callback) => {
//         callback(null, './public/img/users');
//     },
//     filename: (req, file, callback) => {
//         const ext = file.mimetype.split('/')[1];
//         callback(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//     }
// });
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

const filter = (obj, ...allowedFields) => {
    const filteredData = {};
    Object.keys(obj).forEach(el => {
        if (allowedFields.includes(el)) {
            filteredData[el] = obj[el];
        }
    });
    return filteredData;
};

// exports.addNewUser = factory.createOne(User);
exports.addNewUser = async (req, res) => {
    const user = await User.create(req.body);
    res.status(200).json({
        status: 'success',
        data: {
            user
        }
    });
};

exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);

exports.updateMe = catchAsync(async (req, res, next) => {
    if (req.body.password || req.body.passwordConfirm) {
        return next(
            new AppError(
                'This route is not for password update. please try /forgotPassword'
            ),
            403
        );
    }
    // Filtered out unwanted fields names that are not allowed to update
    const filteredData = filter(req.body, 'name', 'email');
    if (req.file) filteredData.photo = req.file.filename;

    const updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        filteredData,
        {
            new: true,
            runValidators: true
        }
    );

    res.status(200).json({
        status: 'success',
        updatedUser
    });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
    await User.findByIdAndUpdate(req.user.id, { active: false });

    res.status(204).json({
        status: 'success',
        data: null
    });
});

exports.getMe = (req, res, next) => {
    req.params.id = req.user.id;
    next();
};

exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
    if (!req.file) return next();

    req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

    await sharp(req.file.buffer)
        .resize(500, 500)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`./public/img/users/${req.file.filename}`);

    console.log(req.file.filename);
    next();
});
