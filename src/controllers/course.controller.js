import Course from '../models/course.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import apiError from '../utils/apiError.js';
import apiResponse from '../utils/apiResponse.js';
import fs from 'fs'
import cloudinary from 'cloudinary'
import cloudinaryUpload from '../utils/cloudinaryUpload.js';


/**
 * @ALL_COURSES
 * @ROUTE @GET {{URL}}/api/v1/courses
 * @ACCESS Public
 */
export const getAllCourses = asyncHandler(async (_req, res, next) => {
    // Find all the courses without lectures
    const courses = await Course.find({}).select('-lectures');
    console.log('courses', courses);
    if (!courses) {
        throw next(new apiError('courses not found'))
    }

    res
        .status(200)
        .json(
            new apiResponse(200, courses, "All courses fetched successfully")
        );
});

/**
 * @CREATE_COURSE
 * @ROUTE @POST {{URL}}/api/v1/courses
 * @ACCESS Private (admin and teachers only)
 */
export const createCourse = asyncHandler(async (req, res, next) => {
    const { title, description, category } = req.body;

    if (!title || !description || !category) {
        return next(new apiError('All fields are required', 400));
    }

    const course = await Course.create({
        title,
        description,
        category,
        thumbnail: {
            public_id: title,
            secure_url: 'https://res.cloudinary.com/du9jzqlpt/image/upload/v1674647316/avatar_drzgxv.jpg',
        },
        createdBy: req.user?._id
    });
    console.log('course', course);

    if (!course) {
        return next(
            new apiError('Course could not be created, please try again', 400)
        );
    }
    // Run only if user sends a file
    if (req.file) {
        try {
            const thumbnailCloudinary = await cloudinaryUpload(req.file)

            // If success
            if (thumbnailCloudinary) {
                // Set the public_id and secure_url in array
                course.thumbnail.public_id = thumbnailCloudinary.public_id;
                course.thumbnail.secure_url = thumbnailCloudinary.secure_url;
            }
        } catch (error) {
            // Send the error message
            return next(
                new apiError(
                    JSON.stringify(error) || 'File not uploaded, please try again',
                    400
                )
            );
        }
    }

    // Save the changes
    await course.save();

    res
        .status(201)
        .json(
            new apiResponse(201, course, "course created successfully")
        );
});