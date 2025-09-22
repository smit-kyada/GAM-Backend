import express from "express";
const router = express.Router();
import affRequestRoutes from "./affRequest.js";
import userDataRoutes from "./userData.js";
import siteRequestRoutes from "./siteRequest.js";

router.use('/affiliateRequest', affRequestRoutes);

router.use('/user', userDataRoutes);

router.use('/siteRequest', siteRequestRoutes);

export default router