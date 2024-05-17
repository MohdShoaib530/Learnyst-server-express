import asyncHandler from '../middlewares/asyncHandler.middleware.js';
import User from '../models/user.model.js';
import apiError from '../utils/apiError.js';
import apiResponse from '../utils/apiResponse.js';
import sendEmail from '../utils/sendEmail.js';

/**
 * @CONTACT_US
 * @ROUTE @POST {{URL}}/api/v1/contact
 * @ACCESS Public
 */
export const contactUs = asyncHandler(async (req, res, next) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return next(new apiError('Name, Email, Message are required'));
  }

  try {
    const subject = 'Contact Us Form';
    const textMessage = `${name} - ${email} <br /> ${message}`;

    await sendEmail(process.env.CONTACT_US_EMAIL, subject, textMessage);
  } catch (error) {
    console.log(error);
    return next(new apiError(error.message, 400));
  }

  res
    .status(200)
    .json(
      new apiResponse(200, {}, 'Your request has been submitted successfully')
    );
});

/**
 * @USER_STATS_ADMIN
 * @ROUTE @GET {{URL}}/api/v1/admin/stats/users
 * @ACCESS Private(ADMIN ONLY)
 */
export const userStats = asyncHandler(async (req, res, next) => {
  const allUsersCount = await User.countDocuments();

  const subscribedUsersCount = await User.countDocuments({
    'subscription.status': 'active'
  });

  res.status(200).json(
    new apiResponse(
      200,
      {
        allUsersCount,
        subscribedUsersCount
      },
      'All registered users count'
    )
  );
});
