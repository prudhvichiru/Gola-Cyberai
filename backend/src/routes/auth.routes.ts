import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';

export const authRouter = Router();

authRouter.post('/sign-in', AuthController.signIn);
authRouter.post('/sign-up', AuthController.signUp);
authRouter.get('/session', AuthController.getSession);
authRouter.post('/request-access', AuthController.requestAccess);
