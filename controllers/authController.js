const { promisify } = require('util');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

const getJWTToken = id => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
};

const createSendToken = (user, statusCode, res) => {
    const token = getJWTToken(user._id);
    const cookieOptions = {
        expires: new Date(
            Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
        ),
        httpOnly: true
    };
    if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

    res.cookie('jwt', token, cookieOptions);

    // Remove password and active from response
    user.password = undefined;
    user.active = undefined;

    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user
        }
    });
};

exports.signup = catchAsync(async (req, res, next) => {
    // const newUser = await User.create({
    //     name: req.body.name,
    //     email: req.body.email,
    //     password: req.body.password,
    //     passwordConfirm: req.body.passwordConfirm,
    //     passwordChangedAt: req.body.passwordChangedAt
    // });

    const newUser = await User.create(req.body);
    const url = `${req.protocol}://${req.get('host')}/me`;
    console.log(url);
    await new Email(newUser, url).sendWelcome();
    createSendToken(newUser, 200, res);
});

exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    //1) check if email & password exist
    if (!email || !password) {
        return next(new AppError('Please provide email & Password', 400));
    }
    //2)check if password is correct
    const user = await User.findOne({ email }).select('+password');
    //const correct =await user.isCorrectPassword(password, user.password);
    if (!user || !(await user.isCorrectPassword(password, user.password))) {
        return next(new AppError('Incorrect email or password', 401));
    }
    //3) If everything ok, send token to client
    createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
    res.cookie('jwt', 'logged out', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });
    res.status(200).json({
        status: 'success'
    });
};

// if not logged in then cant access the route getAllTours
exports.protect = catchAsync(async (req, res, next) => {
    let token;
    //1) Getting token and if it is there
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
        token = req.cookies.jwt;
    }

    if (!token) {
        return next(new AppError('Please login to access this ', 401));
    }
    //2) validate token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    //3) check if user still esixts
    const currentUser = await User.findById(decoded.id);
    if (!currentUser)
        return next(
            new AppError('The user belonging to this token does not exist'),
            401
        );
    //4) check if user changed password after the token was issued
    if (currentUser.changedPasswordCompare(decoded.iat)) {
        return next(
            new AppError('User recently changed password. Please login again'),
            401
        );
    }
    //Grant access to protected route
    req.user = currentUser;
    res.locals.user = currentUser;

    // providing stripe secret key for payments
    if (req.url.startsWith('/checkout-session')) {
        req.headers.authorization = `Bearer ${process.env.STRIPE_SECRET_KEY}`;
    }
    next();
});

// Only for rendered pages, no error
exports.isLoggedIn = async (req, res, next) => {
    //1)If cookie is there
    try {
        if (req.cookies.jwt) {
            //2) validate token
            const decoded = await promisify(jwt.verify)(
                req.cookies.jwt,
                process.env.JWT_SECRET
            );
            //3) check if user still esixts
            const currentUser = await User.findById(decoded.id);
            if (!currentUser) {
                return next();
            }
            //4) check if user changed password after the token was issued
            if (currentUser.changedPasswordCompare(decoded.iat)) {
                return next();
            }
            //THERE IS A LOGGED IN USER
            res.locals.user = currentUser;
            return next();
        }
    } catch (err) {
        //console.log(err);
        return next();
    }
    next();
};

exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        // roles = ['admin','lead-guide'], role='user'
        if (!roles.includes(req.user.role)) {
            return next(
                new AppError(
                    'You do not have permission to perform this action',
                    403
                )
            );
        }
        next();
    };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
    //1. get the user from the given email
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        return next(new AppError('There is no user with this address', 404));
    }
    // get the password reset token
    const passwordResetToken = user.forgetPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    try {
        const resetUrl = `${req.protocol}://${req.get(
            'host'
        )}/api/v1/users/resetPassword/${passwordResetToken}`;
        console.log(passwordResetToken);
        await new Email(user, resetUrl).sendPasswordReset();

        res.status(200).json({
            status: 'success',
            token: passwordResetToken
        });
    } catch (err) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });
        console.log(err);
        return next(
            new AppError(
                'There was an error sending the mail. try again later!',
                500
            )
        );
    }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
    //1 encrypt the token
    const hashToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');
    //2 check if the user exists and change request has not expired
    const user = await User.findOne({
        passwordResetToken: hashToken,
        passwordResetExpires: { $gt: Date.now() }
    });
    if (!user) {
        return next(new AppError('Token is invalid or has expired'), 400);
    }

    //3 update the password and delete token and its expiration
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    // run all the validators
    user.save();

    // 4 login user and send the token
    const token = getJWTToken(user._id);
    res.status(200).json({
        status: 'success',
        token
    });
});

exports.updatePassword = catchAsync(async (req, res, next) => {
    //1. get user from collection
    const { currentPassword, newPassword, passwordConfirm } = req.body;
    const currentUser = await User.findById(req.user.id).select('+password');

    //2. check if current password is correct
    if (
        !(await currentUser.isCorrectPassword(
            currentPassword,
            currentUser.password
        ))
    ) {
        return next(new AppError('current Password is not correct'), 403);
    }
    //3. update password
    currentUser.password = newPassword;
    currentUser.passwordConfirm = passwordConfirm;

    await currentUser.save();

    //4. login user , send new jwt
    createSendToken(currentUser, 200, res);
});
