import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import envVar from '../configs/config.js'
import crypto from 'crypto'

const userSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true,
            minlength: [5, 'Name should be at least 5 character'],
            maxlength: [25, 'Name should be less than 25 characters'],
            lowercase: true,
            trim: true
        },
        email: {
            type: String,
            index: true,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            match: [
                /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
                'Please enter a valid email address'
            ]
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [8, 'Password should at least 8 characters'],
            select: false
        },
        subscription: {
            id: String,
            status: String,
        },
        avatar: {
            public_id: {
                type: String
            },
            secure_url: {
                type: String
            }
        },
        coverImage: {
            public_id: {
                type: String
            },
            secure_url: {
                type: String
            }
        },
        role: {
            type: String,
            enum: ['STUDENT', 'ADMIN', 'TEACHER'],
            default: 'STUDENT'
        },
        refreshToken: {
            type: String,
            select: false
        },
        forgotPasswordToken: String,
        forgotPasswordTokenExpiry: Date,
        emailChangeToken: String,
        emailChangeTokenExpiry: Date,
    },
    { timestamps: true }
);

// Hashes password before saving to the database
userSchema.pre('save', async function (next) {
    // If password is not modified then do not hash it
    if (!this.isModified('password')) {
        return next();
    }

    this.password = await bcrypt.hash(this.password, 10);
    next()
});

userSchema.methods = {
    comparePassword: async function (password) {
        return await bcrypt.compare(password, this.password)
    },

    // will generate a jwt token with user id with payload
    generateAccessToken: function () {
        return jwt.sign(
            {
                _id: this._id,
                email: this.email,
                role: this.role,
                subscription: this.subscription
            },
            envVar.accessTokenSecret,
            {
                expiresIn: envVar.accessTokenExpiry
            }
        );
    },

    generateRefreshToken: function () {
        return jwt.sign(
            {
                _id: this._id
            },
            envVar.refreshTokenSecret,
            {
                expiresIn: envVar.refreshTokenExpiry
            }
        )
    },

    generatePasswordResetToken: function () {
        const resetToken = crypto.randomBytes(20).toString('hex')

        this.forgotPasswordToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex')

        this.forgotPasswordTokenExpiry = Date.now() + 15 * 60 * 1000

        return resetToken
    },

    emailChangeTokenGenerate: function () {
        const resetToken = crypto.randomBytes(20).toString('hex')

        this.emailChangeToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex')

        this.emailChangeTokenExpiry = Date.now() + 15 * 60 * 1000

        return resetToken
    },
};

const User = mongoose.model('User', userSchema);

export default User;