const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'A user must have a name'],
            trim: true,
            maxlength: [30, 'A name must be less or equal 30 char'],
            minlength: [3, 'A name must be greater or equal 3 char']
        },
        email: {
            type: String,
            required: [true, 'A user must have a email id'],
            unique: true,
            lowercase: true,
            trim: true,
            validate: [validator.isEmail, 'please provide a valid email']
        },
        role: {
            type: String,
            enum: ['user', 'guide', 'lead-guide', 'admin'],
            default: 'user'
        },
        photo: {
            type: String,
            default: 'default.jpg'
        },
        passwordChangedAt: Date,
        password: {
            type: String,
            required: [true, 'Please provide a password'],
            minlength: [8, 'Password should be min of 8 length'],
            select: false
        },
        passwordConfirm: {
            type: String,
            required: [true, 'Please confirm your password'],
            validate: {
                // This only works on CREATE and SAVE!!!
                validator: function(el) {
                    return el === this.password;
                },
                message: 'Passwords are not the same'
            }
        },
        passwordResetToken: {
            type: String
        },
        passwordResetExpires: Date,
        active: {
            type: Boolean,
            default: true,
            select: false
        }
    },
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

userSchema.pre('save', function(next) {
    if (!this.isModified('password') || this.isNew) return next();

    this.passwordChangedAt = Date.now() - 1000;
    next();
});
userSchema.pre('save', async function(next) {
    // Only run the function if password is modified
    if (!this.isModified('password')) return next();
    // hash the pwd with cost of 12
    this.password = await bcrypt.hash(this.password, 12);
    // delete the confirm password
    this.passwordConfirm = undefined;
    next();
});

// to check if user is active or not
userSchema.pre(/^find/, function(next) {
    // this points to the current query
    this.find({ active: true });
    next();
});

userSchema.methods.isCorrectPassword = async function(
    candidatePassword,
    userPassword
) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordCompare = function(JWTTimeStamp) {
    if (this.passwordChangedAt) {
        const passwordTimeStamp = parseInt(
            this.passwordChangedAt.getTime() / 1000,
            10
        );
        return JWTTimeStamp < passwordTimeStamp;
    }
    // Means password not changed after the token
    return false;
};

userSchema.methods.forgetPasswordResetToken = function() {
    const resetToken = crypto.randomBytes(32).toString('hex');

    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minute

    return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
