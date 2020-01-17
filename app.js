const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
// eslint-disable-next-line node/no-extraneous-require
const hpp = require('hpp');
const path = require('path');
const cookieParser = require('cookie-parser');

const app = express();

// for submitting data from HTML with action tag
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
// serving static file
app.use(express.static(path.join(__dirname, 'public')));

// Global Middleware
// set security http headers
app.use(helmet());

// Limit requests from same IP
const limiter = rateLimit({
    max: 100,
    windowMs: 60 * 60 * 1000,
    message: 'Too many request from this IP. plz try after an hour'
});
app.use('/api', limiter);

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

// 2) Route Handlers
const viewRouter = require('./routes/viewRoutes');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const reviewRouter = require('./routes/reviewRoutes');

// 1) body parser, reading data from body into req.body
app.use(express.json());
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// parameter pollution
app.use(
    hpp({
        whitelist: ['duration', 'average', 'difficulty', 'price', 'ratings']
    })
);

// for testing purpose
app.use((req, res, next) => {
    next();
});

//Routes
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

app.all('*', (req, res, next) => {
    // res.status(404).json({
    //     status: 'fail',
    //     message: `Can't find ${req.originalUrl} on this server`
    // });

    const err = new AppError(
        `Can't find ${req.originalUrl} on this server`,
        404
    );
    next(err);
});

app.use(globalErrorHandler);

module.exports = app;
