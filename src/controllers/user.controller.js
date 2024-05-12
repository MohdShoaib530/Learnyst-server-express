import asyncHandler from '../utils/asyncHandler.js';
import User from '../models/user.model.js';
import apiError from '../utils/apiError.js';
import cloudinaryUpload from '../utils/cloudinaryUpload.js';
import generateTokens from '../utils/generateTokens.js';
import envVar from '../configs/config.js';
import apiResponse from '../utils/apiResponse.js';
import jwt from 'jsonwebtoken';

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
