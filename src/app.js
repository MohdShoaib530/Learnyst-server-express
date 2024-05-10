import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import errorMiddleware from './middleware/error.middleware.js';
import envVar from './configs/config.js'
import userRouter from './routes/user.routes.js';
const app = express();


// built in middleware
app.use(express.json({
    limit: '16kb'
}));
app.use(express.urlencoded({
    extended: true,
    limit: '16kb'
}));

app.use(express.static('public'))

// third party middleware
app.use(
    cors({
        origin: envVar.frontendUrl,
        credentials: true
    })
);

app.use(morgan('dev'));
app.use(cookieParser());

app.get('/time', async (_req, res) => {
    res.status(200).json('Running very fastly');
});

// user routes

app.use('/api/v1/user', userRouter);

// default catch for all the other routes

app.use('*', async (_req, res) => {
    res.status(404).json('404 page not found');
});

// custom error handeling middleware

app.use(errorMiddleware);

export default app;


