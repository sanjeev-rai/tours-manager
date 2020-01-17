const AppError = require('./../utils/appError');

const sendErrorDev = (err, req, res) => {
    // A) API error
    if (req.originalUrl.startsWith('/api')) {
        return res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
            error: err,
            stack: err.stack
        });
    }
    // B) Rendered website
    res.status(err.statusCode).render('error', {
        title: 'Something went wrong!',
        msg: err.message
    });
};

const sendErrorProd = (err, req, res) => {
    // A) API errors
    if (req.originalUrl.startsWith('/api')) {
        // 1) Operational, trusted error: send message to client
        if (err.isOperational) {
            return res.status(err.statusCode).json({
                status: err.status,
                message: err.message
            });
        }
        // 2) Programming or other unknown error: don't leak the details
        console.log('error', err);
        return res.status(500).json({
            status: 'error',
            message: 'Something went very wrong'
        });
    }
    // B) Rendered website errors

    if (err.isOperational) {
        // 1) Operational, trusted error: send message to client
        return res.status(err.statusCode).render('error', {
            title: 'Something went wrong!',
            msg: err.message
        });
    }

    // 2) Programming or other unknown error: don't leak the details
    return res.status(err.statusCode).render('error', {
        title: 'Something went wrong!',
        msg: 'Please try again later!'
    });
};

const handleCastErrorDB = error => {
    return new AppError(`Invalid ${error.path}: ${error.value}`, 400);
};

const handleDuplicateFieldsDB = err => {
    const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
    return new AppError(`Tour name :${value} already exists`, 500);
};
const handleValidationErrorDB = err => {
    const errors = Object.values(err.errors).map(el => el.message);
    const message = `Invalid input data: ${errors.join('. ')}`;
    return new AppError(message, 500);
};

const handleJWTError = () =>
    new AppError('Invalid token. Please login again', 401);

const handleJWTExpiredError = () =>
    new AppError('Token Expired. please login again', 401);

module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, req, res);
    } else if (process.env.NODE_ENV === 'production') {
        let error = { ...err };
        error.message = err.message;

        if (error.name === 'CastError') error = handleCastErrorDB(error);
        if (error.code === 11000) error = handleDuplicateFieldsDB(error);
        if (error.name === 'ValidationError')
            error = handleValidationErrorDB(error);
        if (error.name === 'JsonWebTokenError') error = handleJWTError();
        if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

        sendErrorProd(error, req, res);
    }
};
