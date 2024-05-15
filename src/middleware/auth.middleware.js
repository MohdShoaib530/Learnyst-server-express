import apiError from '../utils/apiError.js'
import jwt from 'jsonwebtoken'
import envVar from '../configs/config.js'
import asyncHandler from '../utils/asyncHandler.js'
import User from '../models/user.model.js'

export const isLoggedIn = asyncHandler(async (req, _, next) => {
    try {
        const token = req.cookies?.accessToken || req.header('Authorization')?.replace("Bearer ", "")
        if (!token) {
            return next(new apiError("Unable to get the accessToken", 401))
        }

        const decoded = await jwt.verify(token, envVar.accessTokenSecret)

        if (!decoded) {
            throw next(new apiError("Inavlid access Token", 401))
        }

        const user = await User.findById(decoded._id)

        if (!user) {
            throw next(new apiError(401, 'Invalid access token'));
        }
        req.user = user;
        next()
    } catch (error) {
        console.log('error', error);
        throw next(new apiError(error.message || "error while authenticating user", 401))
    }
})

export const authorizeRoles = ([...roles]) =>
    asyncHandler(async (req, _res, next) => {
        console.log('object', roles);
        if (!roles.includes(req.user?.role)) {
            throw next(
                new apiError("You do not have permission to view this route", 403)
            )
        }

        next()
    })

export const authorizeSubscribers = asyncHandler(async (req, _res, next) => {
    const user = await User.findById(req.user._id)
    if ((user.role !== ('ADMIN' || 'TEACHER')) && (user.subscription.status !== "active")) {
        throw next(new apiError("Please subscribe to access this route.", 403))
    }
    next()
})
