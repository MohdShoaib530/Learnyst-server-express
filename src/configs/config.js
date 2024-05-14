const config = {
    port: String(process.env.PORT),
    nodeEnv: String(process.env.NODE_ENV),
    accessTokenSecret: String(process.env.ACCESS_TOKEN_SECRET),
    accessTokenExpiry: String(process.env.ACCESS_TOKEN_EXPIRY),
    refreshTokenSecret: String(process.env.REFRESH_TOKEN_SECRET),
    refreshTokenExpiry: String(process.env.REFRESH_TOKEN_EXPIRY),
    frontendUrl: String(process.env.FRONTEND_URL),
    razorpayKeyId: String(process.env.RAZORPAY_KEY_ID),
    razorpayPlanId: String(process.env.RAZORPAY_PLAN_ID),
    razorpaySecret: String(process.env.RAZORPAY_SECRET),
    cloudinaryApiKey: String(process.env.CLOUDINARY_API_KEY),
    cloudinaryApiSecret: String(process.env.CLOUDINARY_API_SECRET),
    cloudinaryCloudName: String(process.env.CLOUDINARY_CLOUD_NAME),
    mongoUri: String(process.env.MONGO_URI),
    smtpHost: String(process.env.SMTP_HOST),
    smtpPort: String(process.env.SMTP_PORT),
    smtpUsrename: String(process.env.SMTP_USERNAME),
    smtpPassword: String(process.env.SMTP_PASSWORD),
    smtpFromEmail: String(process.env.SMTP_FROM_EMAIL)
};

export default config;  