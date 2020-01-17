const mongoose = require('mongoose');
const slugify = require('slugify');

const tourSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'A tour must have a name'],
            unique: true,
            trim: true,
            maxlength: [40, 'A tour name must be less or equal 40 char'],
            minlength: [10, 'A tour name must be greater or equal 10 char']
        },
        duration: {
            type: Number,
            required: [true, 'A tour must have a duration']
        },
        guides: [
            {
                type: mongoose.Schema.ObjectId,
                ref: 'User'
            }
        ],
        maxGroupSize: {
            type: Number,
            required: [true, 'A tour must have a group size']
        },
        startLocation: {
            type: {
                type: String,
                default: 'Point',
                enum: ['Point']
            },
            coordinates: [Number],
            address: String,
            description: String
        },
        locations: [
            {
                type: {
                    type: String,
                    default: 'Point',
                    enum: ['Point']
                },
                coordinates: [Number],
                address: String,
                description: String,
                day: Number
            }
        ],
        difficulty: {
            type: String,
            required: [true, 'A tour must have a difficulty level'],
            enum: {
                values: ['easy', 'medium', 'difficult'],
                message: 'Difficulty is either: easy, medium, difficult'
            }
        },
        ratingsQuantity: {
            type: Number,
            default: 0
        },
        ratingsAverage: {
            type: Number,
            default: 4.5,
            min: [1, 'Rating must be equal or above 1'],
            max: [5, 'Rating must be equal or below 5'],
            set: val => Math.round(val * 10) / 10
        },
        price: {
            type: Number,
            required: [true, 'A tour must have a price']
        },
        priceDiscount: {
            type: Number,
            validate: {
                validator: function(val) {
                    // this only points to current doc on NEW document creation
                    // so will not work in update
                    return val < this.price;
                },
                message: 'Discount price ({VALUE})should be below regular price'
            }
        },
        summary: {
            type: String,
            trim: true,
            required: [true, 'Summary required']
        },
        description: {
            type: String,
            trim: true
        },
        imageCover: {
            type: String,
            required: [true, 'A tour must have a cover image']
        },
        images: [String],
        createdAt: {
            type: Date,
            default: Date.now(),
            select: false
        },
        startDates: [Date],
        secretTour: {
            type: Boolean,
            default: false
        },
        slug: String
    },
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

tourSchema.index({ price: 1 });
tourSchema.index({ startLocation: '2dsphere' });

tourSchema.virtual('pricePerDay').get(function() {
    return this.price / this.duration;
});

// virtual populate
tourSchema.virtual('reviews', {
    ref: 'Review',
    foreignField: 'tour',
    localField: '_id'
});
// Document middleware: runs before .save() and .create()
/*
tourSchema.pre('save', function(next) {
    console.log('Pre middleware for mongoose');
    next();
});

tourSchema.pre('save', function(doc, next) {
    console.log('Post middleware for mongoose');
    next();
});
*/

// Query middleware:
/*
tourSchema.pre('find', function(next) {
    this.find({ secretTour: { $ne: true } });
    next();
});
*/
tourSchema.pre('save', function(next) {
    this.slug = slugify(this.name, { lower: true });
    next();
});

tourSchema.pre(/^find/, function(next) {
    this.populate({
        path: 'guides',
        select: '-__v -passwordChangedAt'
    });
    next();
});

tourSchema.pre(/^find/, function(next) {
    this.find({ secretTour: { $ne: true } });
    this.start = Date.now();
    next();
});

//Aggregation middleware
// tourSchema.pre('aggregate', function(next) {
//     this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//     console.log(this);
//     next();
// });

// tourSchema.post(/^find/, function(docs, next) {
//     console.log(
//         `Time taken to execute , ${Date.now() - this.start} milliseconds`
//     );
//     next();
// });

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
