
import { Router } from 'express';
import { getTranslationPack } from '../controllers/translationController';

const router = Router();

router.get('/:lang', getTranslationPack);

export default router;
