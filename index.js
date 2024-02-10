import { v2 } from "cloudinary";
import Razorpaya from "razorpay";

import app from "./app.js";
import connectToDb from "./configs/db.js";

export const razorpay = new Razorpaya({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_SECRET
});

v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

app.listen(process.env.PORT, async () => {
    // eslint-disable-next-line no-console
    console.log(`app is listening on port ${process.env.PORT}`);
    await connectToDb();
});
