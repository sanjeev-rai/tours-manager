const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const APIFeatures = require('./../utils/apiFeature');

exports.deleteOne = Model =>
    catchAsync(async (req, res, next) => {
        const doc = await Model.findByIdAndDelete(req.params.id);

        if (!doc) {
            return next(new AppError('No document found with the ID', 404));
        }

        res.status(204).json({
            status: 'success',
            data: null
        });
    });

exports.updateOne = Model =>
    catchAsync(async (req, res, next) => {
        const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        if (!doc) {
            return next(new AppError('No doc found with the ID', 404));
        }

        res.status(200).json({
            status: 'success',
            data: {
                doc
            }
        });
    });

exports.createOne = Model =>
    catchAsync(async (req, res) => {
        const doc = await Model.create(req.body);

        res.status(201).json({
            status: 'success',
            data: {
                data: doc
            }
        });
    });

exports.getOne = (Model, popOptions) =>
    catchAsync(async (req, res, next) => {
        let query = Model.findById(req.params.id);
        if (popOptions) {
            query = query.populate(popOptions);
        }
        const doc = await query;

        if (!doc) {
            return next(new AppError('No document found with the ID', 404));
        }

        res.status(200).json({
            status: 'success',
            data: {
                data: doc
            }
        });
    });

exports.getAll = Model =>
    catchAsync(async (req, res) => {
        // to allow nested routing for tours  (HACK)
        let filter = {};
        if (req.params.tourId) filter = { tour: req.params.tourId };

        const features = new APIFeatures(Model.find(filter), req.query)
            .filter()
            .sort()
            .limitFields()
            .paging();

        const allDoc = await features.query;
        // Send response
        res.status(200).json({
            status: 'success',
            results: allDoc.length,
            data: {
                tours: allDoc
            }
        });
    });
