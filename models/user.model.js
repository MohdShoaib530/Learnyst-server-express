import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
        minlength: [5,'Name should be at least 5 character'],
        maxlength: [25,'Name should be less than 25 characters'],
        lowercase: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        match: [
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
            'Please fill in a valid email address'
        ] // Matches email against regex
    },
    password: {
        type: String,
        required: [true,'Password is required'],
        minlength: [8,'Password should at least 8 characters'],
        select: false
    },
    subscription: {
        id: String,
        status: String
    },
    avatar: {
        public_id: {
            type: String
        },
        secure_url: {
            type: String
        }
    },
    role: {
        type: String,
        enum: ['USER','ADMIN'],
        default: 'USER'
    },
    forgotPasswordToken: String,
    forgotPasswordTokenExpiry: Date
},{timestamps: true});

// Hashes password before saving to the database
userSchema.pre('save', async function (next) {
    // If password is not modified then do not hash it
    if (!this.isModified('password')) {
        return next();
    }

    this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods = {

    // will generate a jwt token with user id with payload
    generateJWTToken: async function(){
        return await jwt.sign(
            {id:this._id, email: this.email, role: this.role, subscription: this.subscription},
            process.env.JWT_SECRET,
            {
                expiresIn:process.env.JWT_EXPIRY
            }
        );
    }
};

export default mongoose.model('User',userSchema);