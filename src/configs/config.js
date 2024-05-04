const config = {
    backendUrl: String(process.env.BACKEND_URL),
    razorpayKeyId: String(process.env.RAZORPAY_KEY_ID),
    razorpayPlanId: String(process.env.RAZORPAY_PLAN_ID),
    razorpaySecret: String(process.env.RAZORPAY_SECRET),
    cloudinaryApiKey: String(process.env.CLOUDINARY_API_KEY),
    cloudinaryApiSecret: String(process.env.CLOUDINARY_API_SECRET),
    cloudinaryCloudName: String(process.env.CLOUDINARY_CLOUD_NAME)
};

export default config;