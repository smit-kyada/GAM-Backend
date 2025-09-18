import express from "express";
const router = express.Router();
import affRequestRoutes from "./affRequest.js";
import userDataRoutes from "./userData.js";

router.use('/affiliateRequest', affRequestRoutes);

router.use('/user', userDataRoutes);

export default router