import async from "async";
import { combineResolvers } from "graphql-resolvers";
import moment from "moment";
import mongoose from "mongoose";
import { emailNotification } from "../functions/emailService.js";
import { FilterQuery } from "../functions/generateFilterQuery.js";
import { GenerateUserObj } from "../functions/GenerateObj.js";
import { generateToken } from "../functions/generateToken.js";
import { isAdmin, isAuthenticated } from "./authorization.js";
import { generateRandomString } from "../functions/generateRandomString.js";
import XLSX from "xlsx";
import path from "path"
import fs from "fs"
import crypto from "crypto"
import jwt from "jsonwebtoken";
import ejs from 'ejs';
import { generatePdf } from "../functions/generateAgreement.js";



const isValidPhoneNumber = (phoneNumber) => {
    const phoneRegex = /^(?:\+91|91)?\d{10}$/;
    return phoneRegex.test(phoneNumber);
};

export default {
    Query: {

        get_me: combineResolvers(isAuthenticated, (parent, args, { models, me }) => {
            return new Promise(async (resolve, reject) => {
                resolve(me)
            })
        }),

        getUser: combineResolvers(isAuthenticated, (parent, { id }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.User.findOne({ _id: id })
                    .then((result) => resolve(result))
                    .catch((error) => reject(error))
            })
        }),

        IsUserBankAcc: combineResolvers(isAuthenticated, (parent, { id }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {

                if (me?.isAdmin) {
                    resolve(true)
                } else {
                    await models?.Account.findOne({ userId: me?.id, isDeleted: false })
                        .then((record) => {
                            if (record) { resolve(true) }
                            else { resolve(false) }
                        })
                        .catch((error) => reject(error))
                }
            })
        }),

        getUserList: combineResolvers(isAuthenticated, (parent, args, { models, me }) => {

            return new Promise(async (resolve, reject) => {

                if (me?.role == "subadmin") {
                    let Obj = {}
                    Obj._id = { $in: me?.users }
                    Obj.isAdmin = false

                    if (args?.search !== "" && args?.search !== undefined && args?.search != null) {
                        const filterText = FilterQuery(args?.search, 'userTbl')
                        Obj.$and = [filterText]
                    }

                    if (args?.filter) {
                        const filter = JSON.parse(args?.filter)
                        if (filter?.role) { Obj.role = filter?.role }
                    }
                    Obj.isDeleted = false

                    await models?.User.paginate(Obj, {
                        page: args?.page, limit: args?.limit, sort: { _id: "-1" },
                        populate: ["users"]
                    })
                        .then((result) => { resolve({ count: result?.total || 0, data: result?.docs || [] }) })
                        .catch((error) => { reject(error) })
                } else {

                    let Obj = {}
                    Obj.role = { $in: ['client'] }
                    Obj.isAdmin = false

                    if (args?.search !== "" && args?.search !== undefined && args?.search != null) {
                        const filterText = FilterQuery(args?.search, 'userTbl')
                        Obj.$and = [filterText]
                    }

                    if (args?.filter) {
                        const filter = JSON.parse(args?.filter)
                        if (filter?.role) {
                            Obj.role = filter?.role
                        }
                    }
                    Obj.isDeleted = false

                    await models?.User.paginate(Obj, {
                        page: args?.page, limit: args?.limit, sort: { _id: "-1" },
                        populate: ["users"]
                    })
                        .then((result) => { resolve({ count: result?.total || 0, data: result?.docs || [] }) })
                        .catch((error) => { reject(error) })
                }
            })
        }),

        getAdminToken: combineResolvers(isAdmin, (parent, { id }, { models, me }) => {

            return new Promise(async (resolve, reject) => {
                await models?.User.findOne({ _id: id, isAdmin: true })
                    .then((result) => {
                        resolve(result?.adminToken)
                    })
                    .catch((error) => reject(error))
            })
        }),

        getJWTUserId: combineResolvers((parent, { token }, { models, me }) => {

            return new Promise(async (resolve, reject) => {

                try {

                    const me = jwt.verify(token, process.env.SECRET)
                    await models?.User.findOne({ _id: me?.id, isDeleted: false })
                        .then((result) => { resolve(result) })
                        .catch((error) => reject(error))

                }
                catch (error) { reject("OTP is expired") }

            })
        }),

    },
    Mutation: {


        register: (parent, { input }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {

                const { userName, email, contact } = input;

                // Validate phone number
                if (!isValidPhoneNumber(contact)) {
                    reject('Invalid phone number format. Please provide a valid Indian mobile number.');
                }

                await models?.User.findOne({ userName, email, isDeleted: false })
                    .then(async (result) => {
                        if (result) reject("User or email all ready taken")
                        else {

                            const registerOtp = crypto.randomInt(100000, 999999).toString();
                            const registerOtpExpiry = Date.now() + 20 * 60 * 1000;

                            await models?.User.create({ ...input, registerOtp, registerOtpExpiry, registerVerified: false })
                                .then(async (ress) => {

                                    const otpToken = jwt.sign({ id: ress?.id }, process.env.SECRET, { expiresIn: "20m" });
                                    const otpLink = `${process.env.MAIN_WEB_URL}/verify-otp?token=${otpToken}`;

                                    console.log("🚀 ~ file: user.js:347 ~ .then ~ otpLink:", otpLink)
                                    console.log("🚀 ~ file: user.js:348 ~ .then ~ otpToken:", otpToken)

                                    // const result = await emailNotification(ress, "RegisterOTP", false);

                                    // if (result?.flag) {
                                        // const sendEmailVerification = await emailNotification(ress, "verifyEmail", false)
                                        // ress.code = sendEmailVerification?.data;
                                        await ress.save();
                                        // if (sendEmailVerification?.flag) {
                                        //     resolve(otpLink)
                                        // }
                                        // else {
                                            resolve({
                                                status: true,
                                                message: "Successfully signed up but email verification link not sent!",
                                                user: ress,
                                            });
                                        // }
                                    // }

                                    // else {
                                    //     resolve({
                                    //         status: true,
                                    //         message: "Successfully signed up but OTP  not sent ! ",
                                    //         user: ress,
                                    //     });

                                    // }


                                }).catch(err => {
                                    console.log("🚀 ~ file: user.js:407 ~ .then ~ err:", err)
                                    reject(err)
                                })

                            // Twilio SMS integration removed



                        }
                    }).catch((error) => {
                        console.log("🚀 ~ file: user.js:419 ~ .then ~ err:", err)
                        reject(error)
                    })
            })
        },

        verifyRegisterOtp: async (parent, { input }, { models }) => {
            return new Promise(async (resolve, reject) => {


                await models?.User.findOne({ _id: input?.userId, isDeleted: false })
                    .then(async (res) => {
                        if (res) {
                            if (Date.now() > res?.registerOtpExpiry || res?.registerVerified == true) {
                                reject("'OTP has expired.'")
                            } else {
                                if (res?.registerOtp == input?.registerOtp) {


                                    await models?.User.findOneAndUpdate({ _id: input?.userId, isDeleted: false }, { registerVerified: true }, { new: true })
                                        .then((data) => {
                                            resolve("OTP verify successfully !")
                                        })
                                        .catch((error) => {
                                            console.log("🚀 ~ file: user.js:446 ~ .then ~ error:", error)
                                            reject("Something went wrong ! please try again with new OTP ")
                                        })
                                } else {
                                    reject("Wrong OTP please enter valid OTP ")
                                }
                            }
                        }
                        else {
                            reject("Something went wrong ! please try again with new OTP ")
                        }
                    })
                    .catch((err) => {
                        reject("Something went wrong ! please try again with new OTP ")
                    })
            })

        },

        verifyEmail: async (parent, { code, id }, { models }) => {
            return new Promise(async (resolve, reject) => {

                await models?.User?.findOne({ _id: id })
                    .then(async (res) => {
                        if (res) {

                            if (res?.isEmailVerified) { reject("User is already verified.") }
                            else {
                                await models.User.findByIdAndUpdate(res?._id, { isEmailVerified: true }, { new: true });
                                resolve(true)
                            }
                        }
                        else { reject("Verification link is expired or invalid, please contact us.") }

                    })
                    .catch((err) => { reject(err) })
            })
        },

        login: (parent, { email, password, isSideLogin }, { models, secret }) => {
            return new Promise(async (resolve, reject) => {
                if (isSideLogin) {
                    await models?.Site.findOne({ site: email, isDeleted: false, isActive: true }).populate("userId")
                        .then(async (site) => {
                            if (site) {
                                let isValid = false;
                                site && (isValid = await site.validatePassword(password));
                                site.role = "client"
                                if (!isValid) { reject(`Site or Password is not Valid`) }
                                else {
                                    generateToken(site, secret, "site").then(async (token) => {
                                        resolve({ user: site, token })
                                    }).catch((error) => reject(error))
                                }
                            } else { reject(`Site or Password is not Valid`) }
                        }).catch((error) => reject(error))

                }
                else {
                    await models?.User.findOne({ email, isDeleted: false }).then(async (user) => {
                        let isValid = false;
                        user && (isValid = await user.validatePassword(password));
                        if (user) {
                            if (user?.isAdmin) {
                                if (!isValid) { reject("Enter a valid password") }
                                else {
                                    generateToken(user, secret, "user").then(async (token) => {

                                        resolve({ user, token })
                                    }).catch((error) => reject(error))

                                }
                            } else {
                                if (user?.isActive) {
                                    if (!isValid) { reject("Enter a valid password") }
                                    else {
                                        generateToken(user, secret, "user").then(async (token) => {
                                            resolve({ user, token })
                                        }).catch((error) => reject(error))
                                    }
                                } else {
                                    reject("Your Account is Not Active")
                                }
                            }
                        } else {
                            reject("Account Not Found")
                        }

                    }).catch((error) => reject(error))
                }
            })
        },

        loginWithMobile: (parent, { email }, { models, secret }) => {
            return new Promise(async (resolve, reject) => {


                await models?.User.findOne({ email, isDeleted: false })
                    .then(async (user) => {


                        if (user) {

                            const phoneOtp = crypto.randomInt(100000, 999999).toString();
                            const phoneOtpExpiry = Date.now() + 20 * 60 * 1000;

                            // Twilio SMS integration removed


                            await models?.User.findOneAndUpdate({ _id: user?.id }, { phoneOtp, phoneOtpExpiry }, { new: true })
                                .then(async (ress) => {

                                    const otpToken = jwt.sign({ id: ress?.id }, process.env.SECRET, { expiresIn: "20m" });
                                    const otpLink = `${process.env.MAIN_WEB_URL}/login-otp?token=${otpToken}`;

                                    const result = await emailNotification(ress, "LoginOTP", false);

                                    if (result?.flag) { resolve(otpLink) }

                                    else {
                                        resolve({
                                            status: true,
                                            message: "Successfully signed up but email verification link not sent!",
                                            user: ress,
                                        });
                                    }

                                })
                                .catch((err) => {
                                    console.log("🚀 ~ file: user.js:576 ~ .then ~ err:", err)
                                    reject(err)
                                })




                        }
                        else {
                            reject("Enter Valid Email ID")
                        }


                    })
                    .catch((error) => reject(error))

            })
        },
        reSendOTP: async (parent, { id, otpType }, { models, secret }) => {

            return new Promise(async (resolve, reject) => {

                try {
                    const user = await models?.User.findOne({ _id: id, isDeleted: false });

                    if (!user) { reject("Enter Valid Email ID") }

                    const otp = crypto.randomInt(100000, 999999).toString();

                    const expiry = Date.now() + 20 * 60 * 1000;
                    const updateData = otpType === "Login" ? { phoneOtp: otp, phoneOtpExpiry: expiry } : { registerOtp: otp, registerOtpExpiry: expiry }

                    const updatedUser = await models?.User.findOneAndUpdate({ _id: user.id }, updateData, { new: true });

                    const otpToken = jwt.sign({ id: updatedUser?.id }, process.env.SECRET, { expiresIn: "20m" });

                    const otpLink = otpType === "Login" ? `${process.env.MAIN_WEB_URL}/login-otp?token=${otpToken}` : `${process.env.MAIN_WEB_URL}/verify-otp?token=${otpToken}`;

                    const notificationType = otpType === "Login" ? "LoginOTP" : "RegisterOTP";

                    const result = await emailNotification(updatedUser, notificationType, false);

                    if (result?.flag) { resolve({ link: otpLink, message: "OTP sent SucessFully" }) }

                    else { reject("Error while sending OTP") }
                }
                catch (error) { reject(error) }
            })

        },
        verifyLoginOtp: async (parent, { input }, { models, secret }) => {
            return new Promise(async (resolve, reject) => {


                await models?.User.findOne({ _id: input?.userId, isDeleted: false })
                    .then(async (res) => {
                        if (res) {
                            if (Date.now() > res?.phoneOtpExpiry) {
                                reject("'OTP has expired.'")
                            } else {
                                if (res?.phoneOtp == input?.phoneOtp) {


                                    await models?.User.findOneAndUpdate({ _id: input?.userId, isDeleted: false }, { phoneOtp: null, phoneOtpExpiry: null }, { new: true })
                                        .then((data) => {

                                            generateToken(data, secret, "user")
                                                .then(async (token) => {
                                                    resolve({ user: data, token })
                                                }).catch((error) => reject(error))
                                        })
                                        .catch((error) => {
                                            console.log("🚀 ~ file: user.js:446 ~ .then ~ error:", error)
                                            reject("Something went wrong ! please try again with new OTP ")
                                        })
                                } else {
                                    reject("Wrong OTP please enter valid OTP ")
                                }
                            }
                        }
                        else {
                            reject("Something went wrong ! please try again with new OTP ")
                        }
                    })
                    .catch((err) => {
                        reject("Something went wrong ! please try again with new OTP ")
                    })
            })

        },
        getMe: combineResolvers(isAuthenticated, (parent, args, { models, me }) => {
            return new Promise(async (resolve, reject) => {
                resolve(me)
            })
        }),
        importUser: combineResolvers(isAdmin, (parent, { input }, { models, me }) => {
            return new Promise(async (resolve, reject) => {
                let counter = 0;
                async.eachSeries(
                    input,
                    async (data, cb) => {
                        let UserData = GenerateUserObj(data);
                        await models?.User?.findOneAndUpdate({ email: UserData?.email }, UserData, { upsert: true, new: true })
                            .then(async (result) => {
                                counter++;
                            })
                        if (cb) cb();
                    }, async (err) => {
                        if (err) reject(err?.message)
                        else if (input?.length === counter) {
                            resolve("User import successfully");
                        }
                    }
                )
            })
        }),
        addUser: combineResolvers(isAdmin, (parent, { input }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                const { userName, email } = input;
                input.isEmailVerified = true
                await models?.User.findOne({ email, isDeleted: false }).then(async (result) => {
                    if (result) {
                        reject("User or email all ready taken")
                    } else {
                        let user = new models.User(input);
                        await user.save()
                            .then(async (data) => {
                                resolve(data)
                            })
                            .catch((error) => reject(error))
                    }
                }).catch((error) => reject(error))
            })
        }),
        updateUser: combineResolvers(isAuthenticated, (parent, { input }, { models, me, secret }, info) => {
            return new Promise(async (resolve, reject) => {
                delete input?.password;
                await models?.User.findOneAndUpdate({ _id: input?.id, isDeleted: false }, input, { new: true })
                    .then(async (result) => {
                        return resolve(result)
                    })
                    .catch((error) => reject(error))

            })
        }),
        blockUser: combineResolvers(isAdmin, (parent, { input }, { models, me, secret }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.User.findOneAndUpdate({ _id: input?.id, isDeleted: false }, { block: input?.block }, { new: true })
                    .then(async (result) => {

                        if (result?.block == true) {

                            const blockMail = await emailNotification(result, "userBlock", false);

                            if (blockMail?.flag) {

                            }

                            // SMS notification removed - Twilio integration disabled
                        }

                        return resolve(result)
                    })
                    .catch((error) => reject(error))

            })
        }),
        inActiveUser: combineResolvers(isAdmin, (parent, { input }, { models, me, secret }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.User.findOneAndUpdate({ _id: input?.id, isDeleted: false }, { isActive: input?.isActive }, { new: true })
                    .then(async (result) => {

                        if (result?.isActive == false) {

                            const blockMail = await emailNotification(result, "userInActive", false);



                            // SMS notification removed - Twilio integration disabled
                        }


                        return resolve(result)
                    })
                    .catch((error) => reject(error))

            })
        }),
        updatePassword: combineResolvers(isAuthenticated, (parent, { id, password }, { models, me, secret }) => {
            return new Promise(async (resolve, reject) => {

                let user01 = await models?.User.findOne({ _id: id })
                user01.password = password
                let user = new models.User(user01);
                await user.save()
                    .then((data) => {
                        return resolve(true)
                    })
                    .catch((error) => {
                        return reject(error)
                    })
            })
        }),
        deleteUser: combineResolvers(isAdmin, (parent, { id }, { models, me }, info) => {

            return new Promise(async (resolve, reject) => {
                await models?.User.findOneAndUpdate({ _id: id, isDeleted: false }, { isDeleted: true })
                    .then(async (res) => {
                        await models?.Applog?.create({ title: info?.fieldName, userId: me?.id })
                        return resolve(true)
                    })
                    .catch((error) => {
                        reject(error)
                    })
            })
        }),
        forgotPassword: async (parent, { email }, { models }) => {
            const user = await models.User.findOne({ email, isDeleted: false });
            let isMobileView = false;
            if (!user) {
                throw new UserInputError("User not found");
            }
            const code = await emailNotification(user, "forgotPassword", isMobileView);
            user.code = code?.data;
            await user.save();
            return true;
        },
        // resetPassword by the code sent to email
        resetPassword: async (parent, { code, password }, { models }) => {
            const user = await models.User.findOne({ code, isDeleted: false });
            if (!user) {
                throw new UserInputError("Code is expired or invalid, please try again");
            }
            user.password = password;
            user.code = "";
            await user.save();
            return true;
        },
        generateAdminToken: combineResolvers(isAdmin, (parent, { id }, { models, me, secret }, info) => {

            const token = generateRandomString(100)

            return new Promise(async (resolve, reject) => {
                await models?.User.findOneAndUpdate({ _id: id, isAdmin: true }, { adminToken: token }, { new: true })
                    .then((result) => resolve(result?.adminToken))
                    .catch((error) => reject(error))
            })
        }),
        DownloadAgreement: combineResolvers(isAuthenticated, (parent, { input }, { models, me }) => {

            return new Promise(async (resolve, reject) => {

                const fileName = `${me?.companyName ? me?.companyName : me?.id}.pdf`
                const filePath = path.join(process.cwd(), 'ASSETS', 'Agreements', `${fileName}`)

                const userAcount = await models?.Account.findOne({ userId: me?.id, isDeleted: false })

                // const Obj = { gstNumber: userAcount?.GstNumber, me }

                me.gstNumber = userAcount?.GstNumber

                const templatePath = path.join(__dirname, '../views', 'agreement.ejs');

                const { userName, companyName, fName, lName, email, contact, companyAddress, pincode, Designation, gstNumber } = me


                ejs.renderFile(
                    path.join(__dirname, "../views/") + `agreement.ejs`,
                    { userName, companyName, fName, lName, email, contact, companyAddress, pincode, Designation, gstNumber },
                    async (err, data) => {
                        if (err) console.log(err);
                        await generatePdf(
                            { content: data },
                            { format: "A5", margin: { top: "15mm", right: "10mm", bottom: "10mm", left: "10mm" } }
                        )
                            .then((pdfBuffer) => {
                                fs.writeFileSync(filePath, pdfBuffer)
                                resolve(fileName)

                            }).catch((err) => {
                                console.log("🚀 ~ ).then ~ err:", err)
                            })
                    }
                );

            })
        }),

        reSendVerificationEmail: async (parent, { id, email }, { models, secret }) => {

            return new Promise(async (resolve, reject) => {

                try {
                    const user = await models?.User.findOne({ email, isDeleted: false });

                    if (!user) { reject("Enter Valid Email ID") }

                    const sendEmailVerification = await emailNotification(user, "verifyEmail", false)

                    if (sendEmailVerification?.flag) {
                        user.code = sendEmailVerification?.data;
                        await user.save()
                        resolve("Verification Email Sent Successfully")
                    }
                    else {
                        reject("Error while sending Verification Email")
                    }
                }
                catch (error) { reject(error) }
            })

        },
    }
}