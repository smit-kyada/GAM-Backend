import models from "../models/index.js";
import { sendResponse } from "../functions/sendResponse.js";

export const getUserData = async (req, res) => {
    try {
        if (req?.headers?.token === "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY0Nzg0MGFjY2FhODc4NDAzNjBjNjk0ZiIsImlhdCI6MTY4NTk2NTI0MH0.JfaNoL-luiPSXVphiyqUDSS3WQ4EjZvkB8hIqpAulPo") {
            if (Object.keys(req?.body?.post).length > 0) {

                const { uId, mobile } = req?.body?.post;

                await models?.GameUser?.findOneAndUpdate({ $or: [{ userId: uId }, { mobile: mobile }] }, { userId: uId }, { upsert: true })

                sendResponse(res, 201, "your request create successfully")

            } else sendResponse(res, 403, "Enter Valid Details")
        } else sendResponse(res, 401, "You are not authenticated")
    }
    catch (error) { return sendResponse(res, 403, { message: error?.message }) }
}