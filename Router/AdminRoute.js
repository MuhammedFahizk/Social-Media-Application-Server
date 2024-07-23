import { Router } from 'express';
import {
  adminLogin,
  generateAccessToken,
  loginWithGoogle,
  verifyAdmin,
  usersList,
  fetchUser,
} from '../controller/Admin.js';
import { adminAuthentication } from '../Middlewares/adminAuthentication.js';

const router = Router();

// Define your routes
router.post('/login', adminLogin);
router.post('/generateAccessToken', generateAccessToken);
router.post('/loginWithGoogle', loginWithGoogle);
router.post('/verifyAdmin',adminAuthentication, verifyAdmin);
router.get('/users', usersList);
router.get('/users/:id', fetchUser);


export default router;
