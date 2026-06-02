import { Router } from 'express';
import { subscribe, unsubscribe, testPush } from '../controllers/pushController';

const router = Router();

// /api/push/subscribe
router.post('/subscribe', subscribe);

// /api/push/unsubscribe
router.post('/unsubscribe', unsubscribe);

// /api/push/test
router.post('/test', testPush);

export default router;
