class APIFeatures {
    constructor(query, queryStr) {
        this.query = query;
        this.queryStr = queryStr;
    }

    filter() {
        // If we just assign the object value to some other variable then
        // it just reference to the value but won't keep shalow copy
        const queryObj = { ...this.queryStr };
        // 1A) FILTERING
        const excludedFields = ['page', 'sort', 'limit', 'fields'];
        excludedFields.forEach(el => delete queryObj[el]);

        // 1B) ADVANCED FILTERING
        let queryStr = JSON.stringify(queryObj);
        // replace method accepting callback with parameter as MATCHED WORD
        queryStr = queryStr.replace(
            /\b(gte|lt|gt|lte)\b/g,
            match => `$${match}`
        );
        this.query = this.query.find(JSON.parse(queryStr));
        return this;
    }

    sort() {
        if (this.queryStr.sort) {
            const sortBy = this.queryStr.sort.split(',').join(' ');
            this.query = this.query.sort(sortBy);
            //sort('price ratingsAverage')
        } else {
            this.query = this.query.sort('-ratingsAverage');
        }
        return this;
    }

    limitFields() {
        if (this.queryStr.fields) {
            const fields = this.queryStr.fields.split(',').join(' ');
            this.query = this.query.select(fields);
        } else {
            this.query = this.query.select('-__id');
        }
        return this;
    }

    paging() {
        const page = this.queryStr.page * 1 || 1;
        const limit = this.queryStr.limit * 1 || 100;
        const skip = (page - 1) * limit;
        /*
        page=3&limit=4  1-4 page 1, 5-8 page 2, 9-12 page 3
        query.skip(8).limit(10)
        */
        this.query = this.query.skip(skip).limit(limit);
        return this;
    }
}

module.exports = APIFeatures;
