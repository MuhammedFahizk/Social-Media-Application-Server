import { Router } from 'express';
import { adminLogin, generateAccessToken, loginWithGoogle } from '../controller/Admin.js';

const router = Router();

// Define your routes
router.post('/login', adminLogin);
router.post('/generateAccessToken', generateAccessToken);
router.post('/loginWithGoogle', loginWithGoogle);



export default router;
