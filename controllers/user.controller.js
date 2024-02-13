import cloudinary from 'cloudinary';
import fs from 'fs';

import asyncHandler from '../middleware/asyncHandler.middleware.js';
import User from '../models/user.model.js';
import AppError from '../utils/appError.js';

const cookieOptions = {
    secure : process.env.NODE_ENV === 'Production' ? true : false,
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true
};
/**
 * @REGISTER
 * @ROUTE @POST {{URL}}/api/v1/user/register
 * @ACCESS Public
 */
export const registerUser = asyncHandler( async (req, res, next) => {

    // destructuring the necessary data from the req object
    const { fullName, email , password} = req.body;

    // check that all the fields are filled properly if not throw error message
    if(!fullName || !email || !password){
        return  next(new AppError('All fields are required',400));
    }

    // find the user in the db using email
    const userExists = await User.findOne({email});

    // if user already exists with the provided email then throw error message
    if(userExists){
        return next(new AppError('Email already registered',400));
    }

    // if user does not exists then crate a user in the db
    const user = await User.create({
        fullName,
        email,
        password,
        avatar: {
            public_id: email,
            secure_url: 'https://res.cloudinary.com/du9jzqlpt/image/upload/v1674647316/avatar_drzgxv.jpg'
        }
    });

    // if any proble occures during user creation then throw an error mesaage
    if(!user){
        return next(new AppError('User registration failed, please try again later'));
    }

    if(req.file){
        try {
            // upload the image on cloudinary
            const result = await cloudinary.v2.uploader.upload(req.file.path,{
                folder: 'yog_user_profile',  // save file in this folder
                width: 250,
                height: 250,
                gravity: 'faces', // This option tells cloudinary to center the image around detected faces (if any) after cropping or resizing the original image
                crop: 'fill'
            });

            if(result){
                // set the public id and secure_url in the db
                user.avatar.public_id = result.public_id,
                user.avatar.secure_url = result.secure_url;

                // after successful upload of file, remove it from local storage
                fs.rm(`uploads${req.file.filefullName}`);
            }
        } catch (error) {
            return next(
                new AppError(error || 'file not uploaded, please try again',400)
            );
        }
    }

    await user.save;

    const token = await user.generateJWTToken();

    user.password = undefined;

    res.cookie('token', token, cookieOptions);

    res.status(201).json({
        success: true,
        message: 'User created successfully',
        user
    });
});