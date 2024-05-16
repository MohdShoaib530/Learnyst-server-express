import apiError from '../utils/apiError.js';
import apiResponse from '../utils/apiResponse.js';
import envVar from '../configs/config.js';
import asyncHandler from '../utils/asyncHandler.js';
import User from '../models/user.model.js';
import Payment from '../models/payment.model.js'
import Razorpay from 'razorpay';
import crypto from 'crypto'

export const razorpay = new Razorpay({
    key_id: envVar.razorpayKeyId,
    key_secret: envVar.razorpaySecret,
});

/**
 * @GET_RAZORPAY_ID
 * @ROUTE @POST {{URL}}/api/v1/payments/razorpay-key
 * @ACCESS Public
 */
export const getRazorpayApiKey = asyncHandler(async (_req, res, _next) => {
    res
        .status(200)
        .json(
            new apiResponse(200, envVar.razorpayKeyId, 'Razorpay Key fetched successfully')
        );
});

/**
 * @ACTIVATE_SUBSCRIPTION
 * @ROUTE @POST {{URL}}/api/v1/payments/subscribe
 * @ACCESS Private (Logged in user only)
 */
export const buySubscription = asyncHandler(async (req, res, next) => {
    try {
        const { id } = req.user;

        const user = await User.findById(id);

        if (!user) {
            return next(new apiError('Unauthorized, please login', 401));
        }

        if (user.role === ('ADMIN' || 'TEACHER')) {
            return next(new apiError('Admin and Teachers cannot purchase a subscription', 400));
        }

        const subscription = await razorpay.subscriptions.create({
            plan_id: envVar.razorpayPlanId,
            customer_notify: 1,
            total_count: 12,
        })

        user.subscription.id = subscription.id;
        user.subscription.status = subscription.status;

        await user.save();

        res
            .status(200)
            .json(
                new apiResponse(200, subscription.id, "subscribed successfully")
            );
    } catch (error) {
        if (error.name === 'RazorpayError') {
            return next(new apiError(`Razorpay error: ${error.description}`, 500));
        } else {
            return next(new apiError('An error occurred while processing the subscription', 500));
        }
    }
});

/**
 * @VERIFY_SUBSCRIPTION
 * @ROUTE @POST {{URL}}/api/v1/payments/verify
 * @ACCESS Private (Logged in user only)
 */
export const verifySubscription = asyncHandler(async (req, res, next) => {
    const { id } = req.user;
    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } =
        req.body;

    const user = await User.findById(id);

    const subscriptionId = user.subscription.id;

    const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_SECRET)
        .update(`${razorpay_payment_id}|${subscriptionId}`)
        .digest('hex');

    if (generatedSignature !== razorpay_signature) {
        return next(new apiError('Payment not verified, please try again.', 400));
    }

    await Payment.create({
        razorpay_payment_id,
        razorpay_subscription_id,
        razorpay_signature,
    });

    user.subscription.status = 'active';
    await user.save();

    res
        .status(200)
        .json(
            new apiResponse(200, {}, "payment verified successfully")
        );
});

/**
 * @CANCEL_SUBSCRIPTION
 * @ROUTE @POST {{URL}}/api/v1/payments/unsubscribe
 * @ACCESS Private (Logged in user only)
 */
export const cancelSubscription = asyncHandler(async (req, res, next) => {
    const { id } = req.user;

    const user = await User.findById(id);

    if (user.role === ('ADMIN' || 'TEACHER')) {
        return next(
            new apiError('Admin and Teachers does not need to cannot cancel subscription', 400)
        );
    }

    const subscriptionId = user.subscription.id;

    try {
        const subscription = await razorpay.subscriptions.cancel(
            subscriptionId // subscription id
        );

        user.subscription.status = subscription.status;

        await user.save();
    } catch (error) {
        return next(new apiError(error.error.description, error.statusCode));
    }

    const payment = await Payment.findOne({
        razorpay_subscription_id: subscriptionId,
    });

    const timeSinceSubscribed = Date.now() - payment.createdAt;

    const refundPeriod = 14 * 24 * 60 * 60 * 1000;

    if (refundPeriod <= timeSinceSubscribed) {
        return next(
            new apiError(
                'Refund period is over, so there will not be any refunds provided.',
                400
            )
        );
    }

    await razorpay.payments.refund(payment.razorpay_payment_id, {
        speed: 'optimum', // This is required
    });

    user.subscription.id = undefined;
    user.subscription.status = undefined;

    await user.save();
    await payment.remove();

    res
        .status(200)
        .json(
            new apiResponse(200, user, 'Subscription cancelled successfully')
        );
});

/**
 * @GET_RAZORPAY_ID
 * @ROUTE @GET {{URL}}/api/v1/payments
 * @ACCESS Private (ADMIN only)
 */
export const allPayments = asyncHandler(async (req, res, _next) => {
    const { count, skip } = req.query;

    const allPayments = await razorpay.subscriptions.all({
        count: count ? count : 10,
        skip: skip ? skip : 0,
    });

    const monthNames = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
    ];

    const finalMonths = {
        January: 0,
        February: 0,
        March: 0,
        April: 0,
        May: 0,
        June: 0,
        July: 0,
        August: 0,
        September: 0,
        October: 0,
        November: 0,
        December: 0,
    };

    const monthlyWisePayments = allPayments.items.map((payment) => {
        const monthsInNumbers = new Date(payment.start_at * 1000);
        return monthNames[monthsInNumbers.getMonth()];
    });

    monthlyWisePayments.map((month) => {
        Object.keys(finalMonths).forEach((objMonth) => {
            if (month === objMonth) {
                finalMonths[month] += 1;
            }
        });
    });

    const monthlySalesRecord = [];

    Object.keys(finalMonths).forEach((monthName) => {
        monthlySalesRecord.push(finalMonths[monthName]);
    });

    res.status(200).json(
        new apiResponse(
            200,
            {
                allPayments,
                finalMonths,
                monthlySalesRecord,
            },
            "All payments"
        )
    );
});