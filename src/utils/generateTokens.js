import User from '../models/user.model.js'
import ApiError from './apiError.js'

const generateTokens = async (id) => {
    try {
        const user = await User.findById(id).select("+refreshToken")
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })
        return { accessToken, refreshToken }
    } catch (error) {
        console.log('error in tokens', error);
        throw new ApiError('Something went wrong while genereating the token', 500)
    }
}

export default generateTokens;