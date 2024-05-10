import dotenv from 'dotenv';
dotenv.config()
import envVar from './configs/config.js'
import { v2 } from 'cloudinary';
import Razorpay from 'razorpay';
import app from './app.js';
import connectToDb from './configs/dbConn.js';

export const razorpay = new Razorpay({
    key_id: envVar.razorpayKeyId,
    key_secret: envVar.razorpaySecret
});

v2.config({
    cloud_name: envVar.cloudinaryCloudName,
    api_key: envVar.cloudinaryApiKey,
    api_secret: envVar.cloudinaryApiSecret
});

connectToDb()
    .then(() => {
        app.on('error', (err) => {
            console.log('Error', err);
        });

        app.listen(envVar.port, async () => {
            console.log(`Server is running on port ${envVar.port}`);
        });
    })
    .catch((error) => {
        console.log('Something went wrong while connecting to db', error);
    });
