import asyncHandler from '../utils/asyncHandler.js';
import User from '../models/user.model.js';
import apiError from '../utils/apiError.js';
import cloudinaryUpload from '../utils/cloudinaryUpload.js';
import generateTokens from '../utils/generateTokens.js';
import envVar from '../configs/config.js';
import apiResponse from '../utils/apiResponse.js';
import jwt from 'jsonwebtoken';
import sendEmail from '../utils/sendEmail.js';
import crypto from 'crypto'
import cloudinary from 'cloudinary'

const cookieOptions = {
    secure: envVar.nodeEnv === 'Production' ? true : false,
    httpOnly: true,
};

/**
 * @REGISTER
 * @ROUTE @POST {{URL}}/api/v1/user/register
 * @ACCESS Public
 */
export const registerUser = asyncHandler(async (req, res, next) => {
    const { fullName, email, password } = req.body;
    console.log('pass', password, email);

    if (
        [fullName, email, password].some((field) => field?.trim() === '')
    ) {
        throw next(new apiError(400, 'All fields are required'));
    }
    const userExists = await User.findOne({ email });

    if (userExists) {
        return next(new apiError('Email already registered', 400));
    }
    const user = await User.create({
        fullName,
        email,
        password,
        avatar: {
            public_id: email,
            secure_url:
                'https://res.cloudinary.com/du9jzqlpt/image/upload/v1674647316/avatar_drzgxv.jpg',
        },
        coverImage: {
            public_id: email,
            secure_url:
                'https://res.cloudinary.com/du9jzqlpt/image/upload/v1674647316/avatar_drzgxv.jpg',
        },
        refreshToken: ""
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken")
    if (!createdUser) {
        return next(
            new apiError('User registration failed, please try again later')
        );
    }
    console.log('createUser', createdUser);

    if (req.files?.avatar || req.files?.coverImage) {
        try {
            let avatarLocalPath;
            if (
                req.files &&
                Array.isArray(req.files.avatar) &&
                req.files.avatar[0].path
            ) {
                avatarLocalPath = req.files.avatar[0].path;
            }
            console.log('avatarlocal', avatarLocalPath);
            const avatarCloudinary = await cloudinaryUpload(avatarLocalPath);

            if (avatarCloudinary) {
                user.avatar.public_id = avatarCloudinary?.public_id;
                user.avatar.secure_url = avatarCloudinary?.secure_url;
            }

            let coverImageLocalPath;
            if (
                req.files &&
                Array.isArray(req.files.coverImage) &&
                req.files.coverImage[0].path
            ) {
                coverImageLocalPath = req.files.coverImage[0].path;
            }
            const coverImageCloudinary = await cloudinaryUpload(coverImageLocalPath);
            if (coverImageCloudinary) {
                user.coverImage.public_id = coverImageCloudinary?.public_id;
                user.coverImage.secure_url = coverImageCloudinary?.secure_url;
            }
        } catch (error) {
            console.log('Error while uploading image', error);
        }
    }

    const { accessToken, refreshToken } = await generateTokens(createdUser._id);
    createdUser.refreshToken = undefined;

    console.log('access', refreshToken);

    res.status(201)
        .cookie('accessToken', accessToken, cookieOptions)
        .cookie('refreshToken', refreshToken, cookieOptions)
        .json(new apiResponse(201, createdUser, 'User created successfully'));
});

export const loginUser = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    if (
        [email, password].some((field) => field?.trim() === '')
    ) {
        throw next(new apiError("All fields are required", 400))
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
        throw next(new apiError("OOPS! User does not exists", 404))
    }

    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
        throw next(new apiError("Password does not match", 401))
    }

    user.password = undefined;

    const { accessToken, refreshToken } = await generateTokens(user._id);

    res
        .status(200)
        .cookie('accessToken', accessToken, cookieOptions)
        .cookie('refreshToken', refreshToken, cookieOptions)
        .json(
            new apiResponse(200, user, "User loggedIn successfully", true)
        )
})

export const logoutUser = asyncHandler(async (req, res, next) => {
    const id = req.user._id

    const updatedUser = await User.findByIdAndUpdate(
        id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    ).select("-password");

    res
        .status(200)
        .clearCookie('accessToken', cookieOptions)
        .clearCookie('refreshToken', cookieOptions)
        .json(
            new apiResponse(200, {}, "User Logged Out Successfully")
        )
})

export const refreshAccessToken = asyncHandler(async (req, res, next) => {
    try {
        const incomingRefreshToken = req.cookie?.refreshToken || req.body?.refreshToken

        if (!incomingRefreshToken) {
            throw next(new apiError("unable to get the refreshToken", 401))
        }

        const decodedRefreshToken = await jwt.verify(incomingRefreshToken, envVar.refreshTokenSecret)

        if (!decodedRefreshToken) {
            throw next(new apiError("Invalid refreshToken", 401))
        }

        const user = await User.findById(decodedRefreshToken._id)

        if (!user) {
            throw next(new apiError("Invalid refreshToken", 401))
        }
        const { accessToken, refreshToken } = await generateTokens(user._id)

        res
            .status(200)
            .cookie("accessToken", accessToken, cookieOptions)
            .cookie("refreshToken", refreshToken, cookieOptions)
            .json(
                new apiResponse(200, user, "refreshToken refreshed")
            )


    } catch (error) {
        console.log('error', error);
    }
})

export const userData = asyncHandler(async (req, res, next) => {
    res
        .status(200)
        .json(
            new apiResponse(200, req.user, "User data got successfully")
        )

})
export const forgotPassword = asyncHandler(async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
        throw next(new apiError("Email is required to reset the password"))
    }
    const user = await User.findOne({ email })
    if (!user) {
        throw next(new apiError("Email is not registered"))
    }

    const resetToken = await user.generatePasswordResetToken()
    await user.save();

    const resetPasswordUrl = `${envVar.frontendUrl}/reset-password/${resetToken}`;
    const subject = "Reset Password";

    const message = `You can reset your password by clicking <a href=${resetPasswordUrl} target="_blank">Reset your password</a>\nIf the above link does not work for some reason then copy paste this link in new tab ${resetPasswordUrl}.\n If you have not requested this, kindly ignore.`;

    try {
        const emailSend = await sendEmail(email, subject, message)
        console.log('emailsend', emailSend);

        if (!emailSend) {
            throw next(new apiError("Email not sent", 401,))
        }

        res
            .status(200)
            .json(
                new apiResponse(200, {}, "Email sent successfully")
            )
    } catch (error) {
        console.log('error while sending email', error);
        user.forgotPasswordToken = undefined;
        user.forgotPasswordTokenExpiry = undefined

        await user.save();

        return next(
            new apiError('Email not sent', 401, error)
        )
    }

})
export const resetPassword = asyncHandler(async (req, res, next) => {
    const { resetToken } = req.params
    const { password } = req.body

    if (!password) {
        throw next(new apiError("Password is required"))
    }

    const forgotPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex')

    const user = await User.findOne({
        forgotPasswordToken,
        forgotPasswordTokenExpiry: { $gt: Date.now() }
    }).select("+password")

    if (!user) {
        return next(
            new apiError('Token is invalid or expired, please try again', 400)
        );
    }

    user.password = password;
    user.forgotPasswordToken = undefined;
    user.forgotPasswordTokenExpiry = undefined
    await user.save()
    user.password = undefined;

    res
        .status(200)
        .json(
            new apiResponse(200, user, "Password changed successfully")
        )
})
export const changePassword = asyncHandler(async (req, res, next) => {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
        throw next(new apiError("new and old both passwords are required", 400))
    }

    const user = await User.findById(req.user._id).select("+password");
    if (!user) {
        throw next(new apiError("Invalid userId or user does not exists", 400))
    }

    try {
        const isPasswordValid = await user.comparePassword(oldPassword);
        if (!isPasswordValid) {
            throw next(new apiError("Invalid old password", 400))
        }

        user.password = newPassword;
        await user.save();
        user.password = undefined;
        user.refreshToken = undefined;

        res
            .status(200)
            .clearCookie('accessToken', cookieOptions)
            .clearCookie('refreshToken', cookieOptions)
            .json(
                new apiResponse(200, user, "Password changed successfully")
            )

    } catch (error) {
        console.log('error', error);
        res
            .status(400)
            .clearCookie('accessToken', cookieOptions)
            .clearCookie('refreshToken', cookieOptions)
            .json(
                new apiError("Password not changed", 400, error)
            )
    }

})

export const updateName = asyncHandler(async (req, res, next) => {
    const { fullName } = req.body
    if (!fullName) {
        throw next(new apiError('fullName is required to update username', 400))
    }
    const user = await User.findById(req.user?._id)
    if (!user) {
        throw next(new apiError('Invalid userId or user does not exists', 404))
    }
    user.fullName = fullName;
    await user.save()

    res
        .status(200)
        .json(
            new apiResponse(200, user, 'fullName has been changed')
        )

})

export const updateEmail = asyncHandler(async (req, res, next) => {
    const email = req.body;
    if (!email) {
        throw next(new apiError("Email is required to update", 400,))
    }
    const user = await User.findById(req.user?._id)
    if (!user) {
        throw next(new apiError("Invalid user or user does not exists"))
    }
    const resetToken = await user.emailChangeTokenGenerate()
    await user.save()

    const changeEmialUrl = `${envVar.frontendUrl}/change-email/${resetToken}`;
    const subject = "Change Emial";

    const message = `You can change your email by clicking <a href=${changeEmialUrl} target="_blank">Reset your password</a>\nIf the above link does not work for some reason then copy paste this link in new tab ${changeEmialUrl}.\n If you have not requested this, kindly ignore.`;

    try {
        const emailSend = await sendEmail(email, subject, message)
        console.log('emailsend', emailSend);

        if (!emailSend) {
            throw next(new apiError("Email not sent", 400,))
        }
        res
            .status(200)
            .json(
                new apiResponse(200, {}, "Email sent successfully")
            )
    } catch (error) {
        console.log('error while sending email', error);
        user.emailChangeToken = undefined;
        user.emailChangeTokenExpiry = undefined

        await user.save();

        return next(
            new apiError('Email not sent', 400, error)
        )
    }

})

export const changeEmail = asyncHandler(async (req, res, next) => {
    const { resetToken } = req.params
    const { email } = req.body
    console.log(resetToken, email);
    if (!(resetToken && email)) {
        new apiError('Token and email is required', 400)
    }
    const emailChangeToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex')

    const user = await User.findOne({
        emailChangeToken,
        emailChangeTokenExpiry: { $gt: Date.now() }
    })

    if (!user) {
        return next(
            new apiError('Token is invalid or expired, please try again', 400)
        );
    }

    user.emailChangeToken = undefined;
    user.emailChangeTokenExpiry = undefined
    user.email = email
    await user.save()

    res
        .status(200)
        .json(
            new apiResponse(200, user, "Email changed successfully")
        )
})

export const updateAvatar = asyncHandler(async (req, res, next) => {
    const avatar = req.file
    console.log(avatar);
    if (!avatar) {
        throw next(new apiError('avatar is required', 400))
    }
    const user = await User.findById(req.user?._id)
    try {
        let avatarLocalPath;
        if (req.file?.path) {
            avatarLocalPath = req.file?.path;
        }
        console.log('avatarlocal', avatarLocalPath);
        const destroyOldAvatar = await cloudinary.v2.uploader.destroy(user.avatar?.public_id)
        const avatarUploadCloudinary = await cloudinaryUpload(avatarLocalPath);

        if (avatarUploadCloudinary) {
            user.avatar.public_id = avatarUploadCloudinary?.public_id;
            user.avatar.secure_url = avatarUploadCloudinary?.secure_url;
            await user.save()
        }

    } catch (error) {
        console.log('Error while uploading image', error);
        throw next(new apiError("something went wrong while updating avatar", 500, error))

    }

    res
        .status(200)
        .json(
            new apiResponse(200, user, "avatar changed successfully")
        )

})
export const updateCoverImage = asyncHandler(async (req, res, next) => {
    const coverImage = req.file
    console.log(coverImage);
    if (!coverImage) {
        throw next(new apiError('avatar is required', 400))
    }
    const user = await User.findById(req.user?._id)
    try {
        let coverImageLocalPath;
        if (req.file?.path) {
            coverImageLocalPath = req.file?.path;
        }
        console.log('avatarlocal', coverImageLocalPath);
        const destroyOldCoverImage = await cloudinary.v2.uploader.destroy(user.coverImage?.public_id)
        const coverImageUploadCloudinary = await cloudinaryUpload(coverImageLocalPath);

        if (coverImageUploadCloudinary) {
            user.coverImage.public_id = coverImageUploadCloudinary?.public_id;
            user.coverImage.secure_url = coverImageUploadCloudinary?.secure_url;
            await user.save()
        }

    } catch (error) {
        console.log('Error while uploading image', error);
        throw next(new apiError("something went wrong while updating avatar", 500, error))

    }

    res
        .status(200)
        .json(
            new apiResponse(200, user, "coverImage changed successfully")
        )
})
