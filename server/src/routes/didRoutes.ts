import express from 'express';
import { generateAvatarVideo, createStream, startStream, submitIce, sendStreamText, deleteStream } from '../controllers/didController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Legacy async video generation endpoint
router.post('/generate', protect, generateAvatarVideo);

// New WebRTC Stream Endpoints
router.post('/stream/create', protect, createStream);
router.post('/stream/sdp', protect, startStream);
router.post('/stream/ice', protect, submitIce);
router.post('/stream/send', protect, sendStreamText);
router.delete('/stream', protect, deleteStream);

export default router;
