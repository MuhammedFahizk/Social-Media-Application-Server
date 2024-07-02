import { userSignUp, generateAccessToken, userLogin, loginWithGoogle } from "../controller/User.js";
import express from "express";
const router = express.Router();

router.post("/signUp", userSignUp);
router.post("/generateAccessToken", generateAccessToken);
router.post("/login", userLogin);
router.post('/loginWithGoogle', loginWithGoogle)

export default router;
