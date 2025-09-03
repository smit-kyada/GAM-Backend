import nodemailer from 'nodemailer';
import ejs from "ejs"
import path from "path"
const { WEB_URL, SERVER_URL, EMAIL_FROM, SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD, SMTP_PORT } = process.env;

export const randomStringGenerator = () => {
    let text = '';
    let possible = '0123456789';
    for (let i = 0; i < 6; i++)
        text += possible.charAt(
            Math.floor(Math.random() * possible.length),
        );
    return text;
};

export const emailNotification = async (user, notifyType, obj) => {
    const linkExpirationCode = await randomStringGenerator();
    const transporter = await nodemailer.createTransport({
        // host: SMTP_HOST,
        // secure: false,
        // port: SMTP_PORT,
        service: 'gmail',
        auth: {
            user: SMTP_USERNAME,
            pass: SMTP_PASSWORD
        }
    });

    const { _id, email, fullName = "User", originalPassword = "", userName, phoneOtp, phoneOtpExpiry, registerOtp, registerOtpExpiry, fName, lName } = user;
    const mailOptions = {
        from: EMAIL_FROM,
        to: email
    }

    const firstName = fullName?.split(" ")?.[0] || "User"

    if (notifyType === "forgotPassword") {
        const link = `${WEB_URL}/reset-password/${_id}_${linkExpirationCode}`;
        ejs.renderFile(
            path.join(__dirname, "../views") + "/reset-password.ejs",
            { firstName, email, link, WEB_URL, SERVER_URL, EMAIL_FROM, linkExpirationCode, obj, originalPassword },
            (err, data) => {
                mailOptions["subject"] = "Reset Password";
                mailOptions["html"] = data;
            }
        );
    }
    else if (notifyType === "verifyEmail") {
        const link = `${WEB_URL}/verify-email/${_id}_${linkExpirationCode}`;
        ejs.renderFile(
            path.join(__dirname, "../views") + "/verify-email.ejs",
            { firstName, email, link, WEB_URL, SERVER_URL, EMAIL_FROM, linkExpirationCode, obj },
            (err, data) => {
                // if (err) console.log("Error :", err);
                mailOptions["subject"] = "Email Verification";
                mailOptions["html"] = data;
            }
        );

    }
    else if (notifyType == "userBlock") {


        const userBlock = "blocked"

        const link = `${WEB_URL}/verify-email/${_id}_${linkExpirationCode}`;


        ejs.renderFile(
            path.join(__dirname, "../views") + "/block-user.ejs",
            { userName, email, link, WEB_URL, SERVER_URL, EMAIL_FROM, linkExpirationCode, obj, userBlock },
            (err, data) => {
                // if (err) console.log("Error :", err);
                mailOptions["subject"] = "Funcliq | Account Block";
                mailOptions["html"] = data;
            }
        );
    }
    else if (notifyType == "userInActive") {


        const userBlock = "Inactive"

        const link = `${WEB_URL}/verify-email/${_id}_${linkExpirationCode}`;


        ejs.renderFile(
            path.join(__dirname, "../views") + "/block-user.ejs",
            { userName, email, link, WEB_URL, SERVER_URL, EMAIL_FROM, linkExpirationCode, obj, userBlock },
            (err, data) => {
                // if (err) console.log("Error :", err);
                mailOptions["subject"] = "Funcliq | Account Block";
                mailOptions["html"] = data;
            }
        );
    }
    else if (notifyType == "LoginOTP") {


        const mainName = userName ? userName : fName + " " + lName
        ejs.renderFile(
            path.join(__dirname, "../views") + "/login-otp.ejs",
            { mainName, email, WEB_URL, SERVER_URL, EMAIL_FROM, obj, phoneOtp, phoneOtpExpiry },
            (err, data) => {
                // if (err) console.log("Error :", err);
                mailOptions["subject"] = "Funcliq | Login OTP";
                mailOptions["html"] = data;
            }
        );
    }
    else if (notifyType == "RegisterOTP") {


        const mainName = userName ? userName : fName + " " + lName
        ejs.renderFile(
            path.join(__dirname, "../views") + "/register-otp.ejs",
            { mainName, email, WEB_URL, SERVER_URL, EMAIL_FROM, obj, registerOtp, registerOtpExpiry },
            (err, data) => {
                // if (err) console.log("Error :", err);
                mailOptions["subject"] = "Funcliq | Register OTP";
                mailOptions["html"] = data;
            }
        );
    }

    const nodeMailorRes = await transporter.sendMail(mailOptions);
    if (nodeMailorRes) {
        return {
            flag: true,
            data: linkExpirationCode,
            message: nodeMailorRes.response
        }
    }
    return { flag: false }
}