import { v2 } from 'cloudinary';
import Razorpay from 'razorpay';

import app from './app.js';
import connectToDb from './configs/db.js';

export const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_SECRET
});

v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});


connectToDb()
    .then(() => {
        app.on('error', (err) => {
            // eslint-disable-next-line no-console
            console.log('Error',err);
        });

        app.listen(process.env.PORT, async () => {
            // eslint-disable-next-line no-console
            console.log(`Server is running on port ${process.env.PORT}`);
        });
    })
    .catch((error) => {
        // eslint-disable-next-line no-console
        console.log('Something went wrong while connecting to db',error);
    });
