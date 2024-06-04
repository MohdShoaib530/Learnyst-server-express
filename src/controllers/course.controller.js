import cloudinary from 'cloudinary';

import Course from '../models/course.model.js';
import apiError from '../utils/apiError.js';
import apiResponse from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import cloudinaryUpload from '../utils/cloudinaryUpload.js';

const buildPipeline = ({ query, sortBy, sortType, page, limit }) => {
  const pipeline = [];

  // Match stage based on query (if provided)
  if (query) {
    pipeline.push({ $match: { title: { $regex: query, $options: 'i' } } });
  }

  // Sort stage based on sortBy and sortType (if provided)
  if (sortBy && sortType) {
    const sortOption = {};
    sortOption[sortBy] = sortType === 'desc' ? -1 : 1;
    pipeline.push({ $sort: sortOption });
  }

  // Pagination stage using $skip and $limit
  const skip = (page - 1) * limit;
  pipeline.push({ $skip: skip });
  pipeline.push({ $limit: parseInt(limit, 10) });
  console.log('pipeline', pipeline);
  return pipeline;
};
/**
 * @ALL_COURSES
 * @ROUTE @GET {{URL}}/api/v1/courses
 * @ACCESS Public
 */
export const getAllCourses = asyncHandler(async (_req, res, next) => {
  const page = 1;
  const limit = 9;
  //TODO: get all videos based on query, sort, pagination

  // Pagination using mongoose-aggregate-paginate-v2
  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10)
  };
  const pipeline = buildPipeline({ page, limit });
  const { docs } = await Course.aggregatePaginate(pipeline, options);
  // Find all the courses without lectures
  console.log('courses', docs);
  if (!docs) {
    throw next(new apiError('courses not found'));
  }

  res
    .status(200)
    .json(new apiResponse(200, docs, 'All courses fetched successfully'));
});

/**
 * @CREATE_COURSE
 * @ROUTE @POST {{URL}}/api/v1/courses
 * @ACCESS Private (admin and teachers only)
 */
export const createCourse = asyncHandler(async (req, res, next) => {
  const { title, description, category } = req.body;
  console.log('req.body', req.body);

  if (!title || !description || !category) {
    return next(new apiError('All fields are required', 400));
  }

  const course = await Course.create({
    title,
    description,
    category,
    thumbnail: {
      public_id: title,
      secure_url:
        'https://res.cloudinary.com/du9jzqlpt/image/upload/v1674647316/avatar_drzgxv.jpg'
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
      const thumbnailCloudinary = await cloudinaryUpload(req.file);

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
    .json(new apiResponse(201, course, 'course created successfully'));
});

/**
 * @Remove_LECTURE
 * @ROUTE @DELETE {{URL}}/api/v1/courses/:courseId/lectures/:lectureId
 * @ACCESS Private (admin and teachers only)
 */
export const removeLectureFromCourse = asyncHandler(async (req, res, next) => {
  // Grabbing the courseId and lectureId from req.query
  const { courseId, lectureId } = req.body;

  console.log('courseId', courseId, lectureId);

  // Checking if both courseId and lectureId are present
  if (!courseId) {
    return next(new apiError('Course ID is required', 400));
  }

  if (!lectureId) {
    return next(new apiError('Lecture ID is required', 400));
  }

  // Find the course uding the courseId
  const course = await Course.findById(courseId).select('+lectures');
  console.log('course', course);

  // If no course send custom message
  if (!course) {
    return next(new apiError('Invalid ID or Course does not exist.', 404));
  }

  // Find the index of the lecture using the lectureId
  const lectureIndex = course.lectures.findIndex(
    (lecture) => lecture._id.toString() === lectureId.toString()
  );

  // If returned index is -1 then send error as mentioned below
  if (lectureIndex === -1) {
    return next(new apiError('Lecture does not exist.', 404));
  }

  // Delete the lecture from cloudinary
  await cloudinary.v2.uploader.destroy(
    course.lectures[lectureIndex].lecture.public_id,
    {
      resource_type: 'video'
    }
  );

  // Remove the lecture from the array
  course.lectures.splice(lectureIndex, 1);

  // update the number of lectures based on lectres array length
  course.numberOfLectures = course.lectures.length;

  // Save the course object
  await course.save();

  // Return response
  res
    .status(200)
    .json(new apiResponse(200, course, 'lecture deleted successfully'));
});

/**
 * @GET_LECTURES_BY_COURSE_ID
 * @ROUTE @POST {{URL}}/api/v1/courses/:id
 * @ACCESS Private(ADMIN,TEACHER and subscribed users only)
 */
export const getLecturesByCourseId = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const course = await Course.findById(id).select('+lectures');

  if (!course) {
    return next(new apiError('Invalid course id or course not found.', 404));
  }

  res
    .status(200)
    .json(
      new apiResponse(
        200,
        { course: course },
        'course lectures fetched successfully'
      )
    );
});

/**
 * @ADD_LECTURE
 * @ROUTE @POST {{URL}}/api/v1/courses/:id
 * @ACCESS Private (Admin Only)
 */
export const addLectureToCourseById = asyncHandler(async (req, res, next) => {
  const { title, description } = req.body;
  const { id } = req.params;

  const lectureData = {};

  if (!title || !description) {
    return next(new apiError('Title and Description are required', 400));
  }

  const course = await Course.findById(id);

  if (!course) {
    return next(new apiError('Invalid course id or course not found.', 400));
  }

  // Run only if user sends a file
  try {
    let lectureLocalPath;
    if (req.file?.path) {
      lectureLocalPath = req.file;
    }
    console.log('lectureLocalPath', lectureLocalPath);
    const lectureUploadCloudinary = await cloudinaryUpload(lectureLocalPath);
    console.log('lectureupload', lectureUploadCloudinary);

    if (lectureUploadCloudinary) {
      lectureData.public_id = lectureUploadCloudinary.public_id;
      lectureData.secure_url = lectureUploadCloudinary.secure_url;
    }

    course.lectures.push({
      title,
      description,
      lecture: lectureData
    });

    course.numberOfLectures = course.lectures.length;

    // Save the course object
    await course.save();

    res
      .status(200)
      .json(new apiResponse(201, course, 'lecture added successfully'));
  } catch (error) {
    console.log('Error while uploading image', error);
    throw next(
      new apiError('something went wrong while adding lecture', 500, error)
    );
  }
});

/**
 * @UPDATE_COURSE_BY_ID
 * @ROUTE @PUT {{URL}}/api/v1/courses/:id
 * @ACCESS Private (Admin and TEACHER)
 */
export const updateCourseById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { title, description, category } = req.body;

  const course = await Course.findById(id).select('-lectures');
  console.log('course', course);
  if (!course) {
    return next(new apiError('Invalid course id or course not found.', 400));
  }

  if (req.file) {
    try {
      const deleteThumbnail = await cloudinary.v2.uploader.destroy(
        course.thumbnail.public_id
      );
      const thumbnailCloudinary = await cloudinaryUpload(req.file);

      // If success
      if (thumbnailCloudinary) {
        // Set the public_id and secure_url in array
        course.thumbnail.public_id = thumbnailCloudinary.public_id;
        course.thumbnail.secure_url = thumbnailCloudinary.secure_url;
        // Save the changes
        await course.save();
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

  const updateCourse = await Course.findByIdAndUpdate(
    id,
    {
      $set: req.body
    },
    {
      new: true
    }
  );

  // Sending the response after success
  res
    .status(200)
    .json(new apiResponse(200, updateCourse, 'course updated successfully'));
});

/**
 * @DELETE_COURSE_BY_ID
 * @ROUTE @DELETE {{URL}}/api/v1/courses/:id
 * @ACCESS Private (Admin only)
 */
export const deleteCourseById = asyncHandler(async (req, res, next) => {
  // Extracting id from the request parameters
  const { id } = req.params;

  // Finding the course via the course ID
  const course = await Course.findByIdAndDelete(id);

  // If course not find send the message as stated below
  if (!course) {
    return next(new apiError('Course with given id does not exist.', 404));
  }

  // Send the message as response
  res
    .status(200)
    .json(new apiResponse(200, course, 'course deleted successfully'));
});
