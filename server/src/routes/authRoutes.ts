import express from 'express';
import { register, login, updateProfile, forgotPassword, resetPassword } from '../controllers/authController';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.put('/update', updateProfile);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
