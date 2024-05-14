import upload from '../middleware/multer.middleware.js';
import { authorizeRoles, isLoggedIn } from '../middleware/auth.middleware.js';
import { Router } from 'express';
import { createCourse, getAllCourses } from '../controllers/course.controller.js';

const router = Router()

router
    .route('/')
    .get(getAllCourses)
    .post(
        isLoggedIn,
        authorizeRoles(['ADMIN', 'TEACHER']),
        upload.single('thumbnail'),
        createCourse
    )
// .delete(isLoggedIn, authorizeRoles('ADMIN'), removeLectureFromCourse);

// router
//     .route('/:id')
//     .get(isLoggedIn, authorizeSubscribers, getLecturesByCourseId) // Added authorizeSubscribers to check if user is admin or subscribed if not then forbid the access to the lectures
//     .post(
//         isLoggedIn,
//         authorizeRoles('ADMIN'),
//         upload.single('lecture'),
//         addLectureToCourseById
//     )
//     .put(isLoggedIn, authorizeRoles('ADMIN'), updateCourseById)
//     .delete(isLoggedIn, authorizeRoles("ADMIN"), deleteCourseById);

export default router;
