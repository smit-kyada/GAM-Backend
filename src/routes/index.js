import express from "express";
const router = express.Router();
import affRequestRoutes from "./affRequest";
import userDataRoutes from "./userData";

router.use('/affiliateRequest', affRequestRoutes);

router.use('/user', userDataRoutes);

export default router