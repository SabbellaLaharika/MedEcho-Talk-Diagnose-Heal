import express from 'express';
import { register, login, updateProfile } from '../controllers/authController';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.put('/update', updateProfile);

export default router;
