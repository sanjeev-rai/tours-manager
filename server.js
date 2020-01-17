const mongoose = require('mongoose');
const dotenv = require('dotenv');
const app = require('./app');

process.on('uncaughtException', err => {
    console.log(err.name, err.message);
    console.log(err);
    console.log('UNCAUGHT EXCEPTION');
    process.exit(1);
});
//process.env.NODE_ENV = 'production';
dotenv.config({ path: './config.env' });

const db = process.env.DATABASE.replace('<PASSWORD>', process.env.DBPASSWORD);
mongoose
    .connect(db, {
        useNewUrlParser: true,
        useCreateIndex: true,
        useFindAndModify: false,
        useUnifiedTopology: true
    })
    .then(() => {
        console.log('DB connected successfully');
    });

//process.env.NODE_ENV = 'production';
const port = process.env.PORT || 1337;
const server = app.listen(port, () => {
    console.log(`listening on port ${port}`);
});

process.on('unhandledRejection', err => {
    console.log(err.name, err.message);
    console.log(err);
    console.log('UNHANDLED REJECTION! Application shut down');
    server.close(() => {
        process.exit(1);
    });
});
