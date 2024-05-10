import apiError from '../utils/apiError'
import jwt from 'jsonwebtoken'
import envVar from '../configs/config.js'
import asyncHandler from '../utils/asyncHandler.js'

const isLoggedIn = asyncHandler(async (req, _, next) => {
    try {
        const token = req.cookies?.accessToken || req.header('Authorization')?.replace("Bearer ", "")

        if (token) {
            next(new apiError("Unable to get the accessToken"))
        }

        const decoded = await jwt.verify(token, envVar.accessTokenSecret)
    } catch (error) {

    }
})