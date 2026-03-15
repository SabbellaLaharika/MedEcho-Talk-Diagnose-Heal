import express from 'express';
import { chatWithAI, speechToText } from '../controllers/mlController';
import { protect } from '../middleware/authMiddleware';
import multer from 'multer';

const router = express.Router();

// Configure multer for file uploads (memory storage)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/chat', protect, chatWithAI);
router.post('/stt', protect, upload.single('file'), speechToText);

export default router;
