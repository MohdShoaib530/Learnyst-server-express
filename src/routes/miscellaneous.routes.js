import { Router } from 'express';

import { authorizeRoles, isLoggedIn } from '../middleware/auth.middleware.js';
import { contactUs, userStats } from '../controllers/miscellaneous.controller.js';

const router = Router();

// {{URL}}/api/v1/
router.route('/contact').post(contactUs);
router
    .route('/admin/stats/users')
    .get(isLoggedIn, authorizeRoles('ADMIN'), userStats);

export default router;
