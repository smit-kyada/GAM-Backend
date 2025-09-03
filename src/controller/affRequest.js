import models from "../models/index";
import { sendResponse } from "../functions/sendResponse";

export const createAffiliateRequest = async (req, res) => {
    try {
        if (req?.headers?.token === "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY0Nzg0MGFjY2FhODc4NDAzNjBjNjk0ZiIsImlhdCI6MTY4NTk2NTI0MH0.JfaNoL-luiPSXVphiyqUDSS3WQ4EjZvkB8hIqpAulPo") {
            if (Object.keys(req?.body?.post).length > 0) {

                const { email, mobile } = req?.body?.post;

                await models?.AffRequest.findOne({ isDeleted: false, email, mobile }).then(async (result) => {
                    if (result) sendResponse(res, 409, "Email and mobile number all ready exists")
                    else {
                        await models?.AffRequest.create(req?.body?.post)
                            .then(async (result) => sendResponse(res, 201, "your request create successfully"))
                            .catch((err) => sendResponse(res, 403, err?.message))
                    }

                }).catch((err) => sendResponse(res, 403, err?.message))

            } else sendResponse(res, 403, "Enter Valid Details")
        } else sendResponse(res, 401, "You are not authenticated")
    }
    catch (error) { return sendResponse(res, 403, { message: error?.message }) }
}