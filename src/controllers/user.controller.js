import cloudinary from 'cloudinary';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

import envVar from '../configs/config.js';
import User from '../models/user.model.js';
import apiError from '../utils/apiError.js';
import apiResponse from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import cloudinaryUpload from '../utils/cloudinaryUpload.js';
import generateTokens from '../utils/generateTokens.js';
import sendEmail from '../utils/sendEmail.js';

const cookieOptions = {
  secure: envVar.nodeEnv === 'Production' ? true : false,
  httpOnly: true
};

/**
 * @REGISTER_USER
 * @POST {{URL}}/api/v1/user/register
 * @ACCESS registered user
 */
export const registerUser = asyncHandler(async (req, res, next) => {
  const { fullName, email, password } = req.body;
  console.log('userdetails', email, password);

  if ([fullName, email, password].some((field) => field?.trim() === '')) {
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
        'https://res.cloudinary.com/du9jzqlpt/image/upload/v1674647316/avatar_drzgxv.jpg'
    },
    coverImage: {
      public_id: email,
      secure_url:
        'https://res.cloudinary.com/du9jzqlpt/image/upload/v1674647316/avatar_drzgxv.jpg'
    },
    refreshToken: ''
  });

  const createdUser = await User.findById(user._id);
  if (!createdUser) {
    return next(
      new apiError('User registration failed, please try again later')
    );
  }
  try {
    const StatusToken = await user.generateUserStatusToken();
    console.log('StatusToken', StatusToken);
    await user.save();
    user.userStatusToken = undefined;
    user.userStatusTokenExpiry = undefined;

    const statusTokendUrl = `${envVar.frontendUrl}/confirm-status/${StatusToken}`;
    const subject = 'Confirm User Status';

    const message = `You can confirm user status by clicking <a href=${statusTokendUrl} target="_blank">Reset your password</a>\nIf the above link does not work for some reason then copy paste this link in new tab ${statusTokendUrl}`;

    const emailSend = await sendEmail(email, subject, message);

    if (!emailSend) {
      throw next(new apiError('Email not sent', 401));
    }

    res
      .status(200)
      .json(
        new apiResponse(
          200,
          createdUser,
          'User created and Email sent successfully'
        )
      );
  } catch (error) {
    console.log('error while creating user or sending email', error);
    await User.findByIdAndDelete(user._id);
    return next(
      new apiError('error while sending email and user deleted', 401, error)
    );
  }
});

/**
 * @CONFIRM_STATUS
 * @POST {{URL}}/api/v1/user/confirm-status
 * @ACCESS mailed user
 */
export const confirmUserStatus = asyncHandler(async (req, res, next) => {
  const { confirmToken } = req.params;
  if (!confirmToken) {
    throw next(new apiError('confirmToken is required required', 400));
  }
  const userStatusToken = crypto
    .createHash('sha256')
    .update(confirmToken)
    .digest('hex');

  const user = await User.findOne({
    userStatusToken,
    userStatusTokenExpiry: { $gt: Date.now() }
  });

  if (!user) {
    return next(
      new apiError('Token is invalid or expired, please try again', 401)
    );
  }
  user.status = true;
  user.userStatusToken = undefined;
  user.userStatusTokenExpiry = undefined;
  await user.save();

  res
    .status(201)
    .json(new apiResponse(201, user, 'User status confirmed successfully'));
});

/**
 * @GETSTATUS_TOKEN
 * @POST {{URL}}/api/v1/user/getStatus_token
 * @ACCESS mailed user
 */
export const getUserStatusToken = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    throw next(new apiError('email is required', 400));
  }
  const user = await User.findOne({ email });

  if (!user) {
    return next(new apiError('Email is not registered', 400));
  }

  try {
    const StatusToken = await user.generateUserStatusToken();
    console.log('StatusToken', StatusToken);
    await user.save();
    user.userStatusToken = undefined;
    user.userStatusTokenExpiry = undefined;

    const statusTokendUrl = `${envVar.frontendUrl}/confirm-status/${StatusToken}`;
    const subject = 'Confirm User Status';

    const message = `You can confirm user status by clicking <a href=${statusTokendUrl} target="_blank">Reset your password</a>\nIf the above link does not work for some reason then copy paste this link in new tab ${statusTokendUrl}`;

    const emailSend = await sendEmail(email, subject, message);

    if (!emailSend) {
      throw next(new apiError('Email not sent', 401));
    }

    res
      .status(200)
      .json(new apiResponse(200, user, 'userStatusToken sent successfully'));
  } catch (error) {
    console.log('error while sending email', error);
    return next(new apiError('error while sending email ', 401, error));
  }
});
/**
 * @DELETE_USER
 * @POST {{URL}}/api/v1/user/delete-user
 * @ACCESS loggedIn user
 */
export const deleteUser = asyncHandler(async (req, res, next) => {
  const deletedUser = await User.findByIdAndDelete(req.user?._id);

  if (!deletedUser) {
    throw next(
      new apiError('something went wrong while deleting the user', 500)
    );
  }
  res
    .status(200)
    .clearCookie('accessToken', cookieOptions)
    .clearCookie('refreshToken', cookieOptions)
    .json(new apiResponse(200, deletedUser, 'user deleted successfully'));
});

/**
 * @LOGIN_USER
 * @POST {{URL}}/api/v1/user/login
 * @ACCESS registered users only
 */
export const loginUser = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if ([email, password].some((field) => field?.trim() === '')) {
    throw next(new apiError('All fields are required', 400));
  }

  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw next(new apiError('OOPS! User does not exists', 404));
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw next(new apiError('Password does not match', 401));
  }

  user.password = undefined;

  const { accessToken, refreshToken } = await generateTokens(user._id);

  res
    .status(200)
    .cookie('accessToken', accessToken, cookieOptions)
    .cookie('refreshToken', refreshToken, cookieOptions)
    .json(new apiResponse(200, user, 'User loggedIn successfully', true));
});

/**
 * @LOGOUT_USER
 * @ROUTE @POST {{URL}}/api/v1/user/logout
 * @ACCESS loggedIn users only
 */
export const logoutUser = asyncHandler(async (req, res, next) => {
  const id = req.user._id;

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
  ).select('-password');

  res
    .status(200)
    .clearCookie('accessToken', cookieOptions)
    .clearCookie('refreshToken', cookieOptions)
    .json(new apiResponse(200, {}, 'User Logged Out Successfully'));
});

/**
 * @REFRESH_ACCESS_TOKEN
 * @ROUTE @POST {{URL}}/api/v1/user/refreshAccessToken
 * @ACCESS loggedIn users only
 */
export const refreshAccessToken = asyncHandler(async (req, res, next) => {
  try {
    const incomingRefreshToken =
      req.cookie?.refreshToken || req.body?.refreshToken;

    if (!incomingRefreshToken) {
      throw next(new apiError('unable to get the refreshToken', 401));
    }

    const decodedRefreshToken = await jwt.verify(
      incomingRefreshToken,
      envVar.refreshTokenSecret
    );

    if (!decodedRefreshToken) {
      throw next(new apiError('Invalid refreshToken', 401));
    }

    const user = await User.findById(decodedRefreshToken._id);

    if (!user) {
      throw next(new apiError('Invalid refreshToken', 401));
    }
    const { accessToken, refreshToken } = await generateTokens(user._id);

    res
      .status(200)
      .cookie('accessToken', accessToken, cookieOptions)
      .cookie('refreshToken', refreshToken, cookieOptions)
      .json(new apiResponse(200, user, 'refreshToken refreshed'));
  } catch (error) {
    console.log('error', error);
  }
});

/**
 * @USER_DATA
 * @ROUTE @POST {{URL}}/api/v1/user/profile
 * @ACCESS loggedIn users only
 */
export const userData = asyncHandler(async (req, res, next) => {
  res
    .status(200)
    .json(new apiResponse(200, req.user, 'User data got successfully'));
});

/**
 * @FORGOT_PASSWORD
 * @ROUTE @POST {{URL}}/api/v1/user/reset-password
 * @ACCESS registered users only
 */
export const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    throw next(new apiError('Email is required to reset the password'));
  }
  const user = await User.findOne({ email });
  if (!user) {
    throw next(new apiError('Email is not registered'));
  }

  const resetToken = await user.generatePasswordResetToken();
  console.log('resetToken', resetToken);
  await user.save();

  const resetPasswordUrl = `${envVar.frontendUrl}/reset-password/${resetToken}`;
  const subject = 'Reset Password';

  const message = `You can reset your password by clicking <a href=${resetPasswordUrl} target="_blank">Reset your password</a>\nIf the above link does not work for some reason then copy paste this link in new tab ${resetPasswordUrl}.\n If you have not requested this, kindly ignore.`;

  try {
    const emailSend = await sendEmail(email, subject, message);
    console.log('emailsend', emailSend);

    if (!emailSend) {
      throw next(new apiError('Email not sent', 401));
    }

    res.status(200).json(new apiResponse(200, {}, 'Email sent successfully'));
  } catch (error) {
    console.log('error while sending email', error);
    user.forgotPasswordToken = undefined;
    user.forgotPasswordTokenExpiry = undefined;

    await user.save();

    return next(new apiError('Email not sent', 401, error));
  }
});

/**
 * @RESET_PASSWORD
 * @ROUTE @POST {{URL}}/api/v1/user/reset-password/:resetToken
 * @ACCESS mailed users only
 */
export const resetPassword = asyncHandler(async (req, res, next) => {
  const { resetToken } = req.params;
  const { password } = req.body;

  if (!password) {
    throw next(new apiError('Password is required'));
  }

  const forgotPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  const user = await User.findOne({
    forgotPasswordToken,
    forgotPasswordTokenExpiry: { $gt: Date.now() }
  }).select('+password');

  if (!user) {
    return next(
      new apiError('Token is invalid or expired, please try again', 400)
    );
  }

  user.password = password;
  user.forgotPasswordToken = undefined;
  user.forgotPasswordTokenExpiry = undefined;
  await user.save();
  user.password = undefined;

  res
    .status(200)
    .json(new apiResponse(200, user, 'Password changed successfully'));
});

/**
 * @CHANGE_PASSWORD
 * @ROUTE @POST {{URL}}/api/v1/user/chanage-password
 * @ACCESS loggedIn users only
 */
export const changePassword = asyncHandler(async (req, res, next) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw next(new apiError('new and old both passwords are required', 400));
  }

  const user = await User.findById(req.user._id).select('+password');
  if (!user) {
    throw next(new apiError('Invalid userId or user does not exists', 400));
  }

  try {
    const isPasswordValid = await user.comparePassword(oldPassword);
    if (!isPasswordValid) {
      throw next(new apiError('Invalid old password', 400));
    }

    user.password = newPassword;
    await user.save();
    user.password = undefined;
    user.refreshToken = undefined;

    res
      .status(200)
      .clearCookie('accessToken', cookieOptions)
      .clearCookie('refreshToken', cookieOptions)
      .json(new apiResponse(200, user, 'Password changed successfully'));
  } catch (error) {
    console.log('error', error);
    res
      .status(400)
      .clearCookie('accessToken', cookieOptions)
      .clearCookie('refreshToken', cookieOptions)
      .json(new apiError('Password not changed', 400, error));
  }
});

/**
 * @UPDATE_NAME
 * @ROUTE @POST {{URL}}/api/v1/user/update-username
 * @ACCESS loggedIn users only
 */
export const updateName = asyncHandler(async (req, res, next) => {
  const { fullName } = req.body;
  if (!fullName) {
    throw next(new apiError('fullName is required to update username', 400));
  }
  const user = await User.findById(req.user?._id);
  if (!user) {
    throw next(new apiError('Invalid userId or user does not exists', 404));
  }
  user.fullName = fullName;
  await user.save();

  res.status(200).json(new apiResponse(200, user, 'fullName has been changed'));
});

/**
 * @UPDATE_EMAIL
 * @ROUTE @POST {{URL}}/api/v1/user/update-email
 * @ACCESS loggedIn users only
 */
export const updateEmail = asyncHandler(async (req, res, next) => {
  const email = req.body;
  if (!email) {
    throw next(new apiError('Email is required to update', 400));
  }
  const user = await User.findById(req.user?._id);
  if (!user) {
    throw next(new apiError('Invalid user or user does not exists'));
  }
  const resetToken = await user.emailChangeTokenGenerate();
  await user.save();

  const changeEmialUrl = `${envVar.frontendUrl}/change-email/${resetToken}`;
  const subject = 'Change Emial';

  const message = `You can change your email by clicking <a href=${changeEmialUrl} target="_blank">Reset your password</a>\nIf the above link does not work for some reason then copy paste this link in new tab ${changeEmialUrl}.\n If you have not requested this, kindly ignore.`;

  try {
    const emailSend = await sendEmail(email, subject, message);
    console.log('emailsend', emailSend);

    if (!emailSend) {
      throw next(new apiError('Email not sent', 400));
    }
    res.status(200).json(new apiResponse(200, {}, 'Email sent successfully'));
  } catch (error) {
    console.log('error while sending email', error);
    user.emailChangeToken = undefined;
    user.emailChangeTokenExpiry = undefined;

    await user.save();

    return next(new apiError('Email not sent', 400, error));
  }
});

/**
 * @CHANGE_EMAIL
 * @ROUTE @POST {{URL}}/api/v1/user/change-email/:resetToken
 * @ACCESS mailed users only
 */
export const changeEmail = asyncHandler(async (req, res, next) => {
  const { resetToken } = req.params;
  const { email } = req.body;
  console.log(resetToken, email);
  if (!(resetToken && email)) {
    new apiError('Token and email is required', 400);
  }
  const emailChangeToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  const user = await User.findOne({
    emailChangeToken,
    emailChangeTokenExpiry: { $gt: Date.now() }
  });

  if (!user) {
    return next(
      new apiError('Token is invalid or expired, please try again', 400)
    );
  }

  user.emailChangeToken = undefined;
  user.emailChangeTokenExpiry = undefined;
  user.email = email;
  await user.save();

  res
    .status(200)
    .json(new apiResponse(200, user, 'Email changed successfully'));
});

/**
 * @UPDATE_AVATAR
 * @ROUTE @POST {{URL}}/api/v1/user/update-avatar
 * @ACCESS loggedIn users only
 */
export const updateAvatar = asyncHandler(async (req, res, next) => {
  const avatar = req.file;
  console.log(avatar);
  if (!avatar) {
    throw next(new apiError('avatar is required', 400));
  }
  const user = await User.findById(req.user?._id);
  try {
    let avatarLocalPath;
    if (req.file?.path) {
      avatarLocalPath = req.file?.path;
    }
    console.log('avatarlocal', avatarLocalPath);
    const destroyOldAvatar = await cloudinary.v2.uploader.destroy(
      user.avatar?.public_id
    );
    const avatarUploadCloudinary = await cloudinaryUpload(avatarLocalPath);

    if (avatarUploadCloudinary) {
      user.avatar.public_id = avatarUploadCloudinary?.public_id;
      user.avatar.secure_url = avatarUploadCloudinary?.secure_url;
      await user.save();
    }
  } catch (error) {
    console.log('Error while uploading image', error);
    throw next(
      new apiError('something went wrong while updating avatar', 500, error)
    );
  }

  res
    .status(200)
    .json(new apiResponse(200, user, 'avatar changed successfully'));
});

/**
 * @UPDATE_COVER_IMAGE
 * @ROUTE @POST {{URL}}/api/v1/user//update-coverImage
 * @ACCESS loggedIn users only
 */
export const updateCoverImage = asyncHandler(async (req, res, next) => {
  const coverImage = req.file;
  console.log(coverImage);
  if (!coverImage) {
    throw next(new apiError('avatar is required', 400));
  }
  const user = await User.findById(req.user?._id);
  try {
    let coverImageLocalPath;
    if (req.file?.path) {
      coverImageLocalPath = req.file?.path;
    }
    console.log('avatarlocal', coverImageLocalPath);
    const destroyOldCoverImage = await cloudinary.v2.uploader.destroy(
      user.coverImage?.public_id
    );
    const coverImageUploadCloudinary =
      await cloudinaryUpload(coverImageLocalPath);

    if (coverImageUploadCloudinary) {
      user.coverImage.public_id = coverImageUploadCloudinary?.public_id;
      user.coverImage.secure_url = coverImageUploadCloudinary?.secure_url;
      await user.save();
    }
  } catch (error) {
    console.log('Error while uploading image', error);
    throw next(
      new apiError('something went wrong while updating avatar', 500, error)
    );
  }

  res
    .status(200)
    .json(new apiResponse(200, user, 'coverImage changed successfully'));
});
