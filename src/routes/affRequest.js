import express from "express";
const router = express.Router();
import { createAffiliateRequest } from './../controller/affRequest.js';

router.post('/create', createAffiliateRequest);

export default router;
