import express from "express";
const router = express.Router();
import { getUserData } from './../controller/userData';

router.get('/create', getUserData);

export default router;