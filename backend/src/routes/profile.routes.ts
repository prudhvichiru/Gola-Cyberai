import { Router } from 'express';
import { ProfileController } from '../controllers/profile.controller.js';

export const profileRouter = Router();

profileRouter.get('/count/active', ProfileController.getActiveCount);
profileRouter.get('/:id', ProfileController.getProfile);
profileRouter.patch('/:id', ProfileController.updateProfile);
