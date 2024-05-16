import { Router } from 'express';

import { addLectureToCourseById, createCourse, deleteCourseById, getAllCourses, getLecturesByCourseId, removeLectureFromCourse, updateCourseById } from '../controllers/course.controller.js';
import { authorizeRoles, authorizeSubscribers, isLoggedIn } from '../middleware/auth.middleware.js';
import upload from '../middleware/multer.middleware.js';

const router = Router();

router
  .route('/')
  .get(getAllCourses)
  .post(
    isLoggedIn,
    authorizeRoles(['ADMIN']),
    upload.single('thumbnail'),
    createCourse
  )
  .delete(isLoggedIn, authorizeRoles(['ADMIN', 'TEACHER']), removeLectureFromCourse);

router
  .route('/:id')
  .get(isLoggedIn, authorizeSubscribers, getLecturesByCourseId)
  .post(
    isLoggedIn,
    authorizeRoles(['ADMIN', 'TEACHER']),
    upload.single('lecture'),
    addLectureToCourseById
  )
  .patch(isLoggedIn, authorizeRoles(['ADMIN', 'TEACHER']),upload.single('thumbnail'), updateCourseById)
  .delete(isLoggedIn, authorizeRoles(['ADMIN']), deleteCourseById);

export default router;
