import express from 'express';
import { getDoctors, getProfile, updateProfile } from '../controllers/userController';

const router = express.Router();

// Public route to get list of doctors (for appointment booking)
router.get('/doctors/list', getDoctors);

router.get('/:id', getProfile);
router.put('/:id', updateProfile);

export default router;
