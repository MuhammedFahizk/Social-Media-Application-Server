import { userSignUp,verifyUser, generateAccessToken,otpValidation, userLogin, loginWithGoogle } from "../controller/User.js";
import express from "express";
import { userAuthentication } from "../Middlewares/userAuthentication.js";
const router = express.Router();
router.post('/otpValidation' , otpValidation)
router.post("/signUp", userSignUp);
router.post("/generateAccessToken", generateAccessToken);
router.post('/verifyUser', userAuthentication,  verifyUser )
router.post("/login", userLogin);
router.post('/loginWithGoogle', loginWithGoogle)

export default router;
