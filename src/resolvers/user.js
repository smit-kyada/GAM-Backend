import async from "async";
import { combineResolvers } from "graphql-resolvers";
import moment from "moment";
import mongoose from "mongoose";
import { emailNotification } from "../functions/emailService";
import { getFullReport, getFullSiteReport, getRangeReport, getReport, getSiteRangeReport, getSiteReport } from "../functions/GenerateAdsenseReport";
import { FilterQuery } from "../functions/generateFilterQuery";
import { GenerateUserObj } from "../functions/GenerateObj";
import { generateToken } from "../functions/generateToken";
import { isAdmin, isAuthenticated } from "./authorization";
import { generateRandomString } from "../functions/generateRandomString";
import XLSX from "xlsx";
import path from "path"
import fs from "fs"
import crypto from "crypto"
import jwt from "jsonwebtoken";
import twilio from "twilio";
import ejs from 'ejs';
import { generatePdf } from "../functions/generateAgreement";


// Twilio configuration
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const isValidPhoneNumber = (phoneNumber) => {
    const phoneRegex = /^(?:\+91|91)?\d{10}$/;
    return phoneRegex.test(phoneNumber);
};

const ObjectId = mongoose.SchemaTypes.ObjectId;

const startOfLastMonth = moment().subtract(1, 'months').startOf('month');
const endOfLastMonth = moment().subtract(1, 'months').endOf('month');


const startDateofMonth = {
    day: startOfLastMonth.date(),
    month: startOfLastMonth.month() + 1,
    year: startOfLastMonth.year()
};
const endDateofMonth = {
    day: endOfLastMonth.date(),
    month: endOfLastMonth.month() + 1,
    year: endOfLastMonth.year()
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

        getAdsenseTotalReport: combineResolvers(isAuthenticated, (parent, args, { models, me }) => {

            return new Promise(async (resolve, reject) => {

                const filter = JSON.parse(args?.filter)
                const startDate = {}
                const endDate = {}

                if (filter?.startDate && filter?.endDate) {

                    const startOfLastMonth = moment(filter?.startDate);
                    const endOfLastMonth = moment(filter?.endDate);

                    startDate.day = startOfLastMonth.date(),
                        startDate.month = startOfLastMonth.month() + 1,
                        startDate.year = startOfLastMonth.year()
                    endDate.day = endOfLastMonth.date(),
                        endDate.month = endOfLastMonth.month() + 1,
                        endDate.year = endOfLastMonth.year()
                }

                if (me?.isAdmin) {
                    try {
                        const countrycodes = filter?.countrycode;

                        const reports = {
                            TODAY: getReport("TODAY", false, filter?.site, countrycodes),
                            YESTERDAY: getReport("YESTERDAY", false, filter?.site, countrycodes),
                            LAST_7_DAYS: getReport("LAST_7_DAYS", false, filter?.site, countrycodes),
                            MONTH_TO_DATE: getReport("MONTH_TO_DATE", false, filter?.site, countrycodes),
                            LAST_MONTH: getRangeReport(filter?.site, countrycodes, startDateofMonth, endDateofMonth),
                        };

                        if (filter?.startDate && filter?.endDate) { reports.DATE_RANGE = getRangeReport(filter?.site, countrycodes, startDate, endDate) }

                        resolve(reports)

                    }
                    catch (error) { reject(error) }

                }
                else {
                    if (filter?.site?.length > 0) {

                        const sites = me?.showAllData ? [] : filter?.site;
                        const countrycodes = filter?.countrycode;

                        try {

                            const reports = {
                                TODAY: getReport("TODAY", false, sites, countrycodes),
                                YESTERDAY: getReport("YESTERDAY", false, sites, countrycodes),
                                LAST_7_DAYS: getReport("LAST_7_DAYS", false, sites, countrycodes),
                                MONTH_TO_DATE: getReport("MONTH_TO_DATE", false, sites, countrycodes),
                                LAST_MONTH: getRangeReport(sites, countrycodes, startDateofMonth, endDateofMonth),
                            };

                            if (filter?.startDate && filter?.endDate) { reports.DATE_RANGE = getRangeReport(sites, countrycodes, startDate, endDate) }
                            resolve(reports)

                        }
                        catch (error) { reject(error) }
                    }
                    else { reject("You Don't have any alloted site") }
                }
            })
        }),

        getAdsenseSiteTotalReport: combineResolvers(isAuthenticated, (parent, args, { models, me }) => {


            return new Promise(async (resolve, reject) => {
                const filter = JSON.parse(args?.filter)
                const countrycode = filter?.countrycode;


                try {
                    const reports = {
                        TODAY: await getSiteReport("TODAY", false, me?.site, countrycode),
                        YESTERDAY: await getSiteReport("YESTERDAY", false, me?.site, countrycode),
                        LAST_7_DAYS: await getSiteReport("LAST_7_DAYS", false, me?.site, countrycode),
                        MONTH_TO_DATE: await getSiteReport("MONTH_TO_DATE", false, me?.site, countrycode),
                    };

                    resolve(reports)

                } catch (error) {
                    reject(error)
                }

            })
        }),

        getAdsenseFullReport: combineResolvers(isAuthenticated, (parent, args, { models, me }) => {

            return new Promise(async (resolve, reject) => {

                const filter = JSON.parse(args?.filter)

                if (me?.isAdmin) {
                    try {
                        const reports = { YEAR_TO_DATE: await getFullReport("YEAR_TO_DATE", filter?.site, filter?.countrycode, args?.limit) }

                        resolve(reports)

                    }
                    catch (error) { reject(error) }

                } else {

                    if (filter?.site?.length > 0) {

                        const sites = me?.showAllData ? [] : filter?.site;

                        try {
                            const reports = { YEAR_TO_DATE: await getFullReport("YEAR_TO_DATE", sites, filter?.countrycode, args?.limit) }

                            resolve(reports)

                        }
                        catch (error) { reject(error) }
                    }
                    else {
                        reject("You Don't have any alloted site")
                    }


                }




            })
        }),

        getAdsenseFullSiteReport: combineResolvers(isAuthenticated, (parent, args, { models, me }) => {

            return new Promise(async (resolve, reject) => {

                const filter = JSON.parse(args?.filter)

                const countrycode = filter?.countrycode;

                try {
                    const reports = { YEAR_TO_DATE: await getFullSiteReport("YEAR_TO_DATE", false, me?.site, countrycode) }

                    resolve(reports)

                }
                catch (error) { reject(error) }

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

                            // client.messages.create({
                            //     body: `Hello! 👋\n\nThank you for choosing Funcliq! Your One-Time Password (OTP) for verification is: **${registerOtp}**.\n\nPlease enter this code on our website to complete your registration process. Remember, this code is valid for a limited time only.\n\nIf you did not request this OTP, please ignore this message.\n\nHappy exploring! 🌟`,
                            //     from: process.env.TWILIO_PHONE_NUMBER,
                            //     to: "+91" + contact,
                            // })
                            //     .then(async (res) => {

                            //         await models?.User.create({ ...input, registerOtp, registerOtpExpiry, registerVerified: false })
                            //             .then(async (ress) => {

                            //                 const otpToken = jwt.sign({ id: ress?.id }, process.env.SECRET, { expiresIn: "20m" });
                            //                 const otpLink = `${process.env.MAIN_WEB_URL}/verify-otp?token=${otpToken}`;

                            //                 resolve(otpLink)

                            //                 // const result = await emailNotification(ress, "verifyEmail", false);
                            //                 // if (result?.flag) {
                            //                 //     ress.code = result?.data;
                            //                 //     await ress.save();
                            //                 //     resolve({
                            //                 //         status: true,
                            //                 //         message: "Successfully signed up and email verification link sent.",
                            //                 //         user: ress,
                            //                 //     });
                            //                 // } else
                            //                 //     resolve({
                            //                 //         status: true,
                            //                 //         message: "Successfully signed up but email verification link not sent!",
                            //                 //         user: ress,
                            //                 //     });

                            //                 // Generate OTP


                            //             }).catch(err => {
                            //                 console.log("🚀 ~ file: user.js:407 ~ .then ~ err:", err)
                            //                 reject(err)
                            //             })
                            //     })
                            //     .catch(err => {
                            //         console.log("🚀 ~ file: user.js:418 ~ .then ~ err:", err)
                            //         reject(err)
                            //     });



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
                    await models?.User.findOne({ email }).then(async (user) => {
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

                            // client.messages.create({
                            //     body: `Funcliq!\n\n  Your One-Time Password (OTP) for verification is: \n\n ${phoneOtp} \n`,
                            //     from: process.env.TWILIO_PHONE_NUMBER,
                            //     to: "+91" + user?.contact?.toString(),
                            // })
                            //     .then(async (res) => {

                            //         await models?.User.findOneAndUpdate({ _id: user?.id }, { phoneOtp, phoneOtpExpiry }, { new: true })
                            //             .then(async (ress) => {

                            //                 const otpToken = jwt.sign({ id: ress?.id }, process.env.SECRET, { expiresIn: "20m" });
                            //                 const otpLink = `${process.env.MAIN_WEB_URL}/login-otp?token=${otpToken}`;

                            //                 resolve(otpLink)
                            //             })
                            //             .catch((err) => {
                            //                 console.log("🚀 ~ file: user.js:576 ~ .then ~ err:", err)
                            //                 reject(err)
                            //             })

                            //     })
                            //     .catch((error) => {
                            //         console.log("🚀 ~ file: user.js:584 ~ .then ~ error:", error)
                            //         reject(error)

                            //     })


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
                await models?.User.findOne({ email }).then(async (result) => {
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

                            client.messages.create({
                                body: `Funcliq!\n Due to invalid Activity your Account is Terminated.\n Please contact us at ${process.env.E_MAIL} for more details`,
                                from: process.env.TWILIO_PHONE_NUMBER,
                                to: "+91" + result?.contact?.toString(),
                            })
                                .then((res) => {

                                })
                                .catch((err) => {
                                    console.log("🚀 ~ file: user.js:722 ~ .then ~ err:", err)

                                })
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



                            client.messages.create({
                                body: `Funcliq!\n Due to invalid Activity your Account is Terminated.\n Please contact us at ${process.env.E_MAIL} for more details`,
                                from: process.env.TWILIO_PHONE_NUMBER,
                                to: "+91" + result?.contact?.toString(),
                            })
                                .then((res) => {
                                })
                                .catch((err) => {
                                    console.log("🚀 ~ file: user.js:722 ~ .then ~ err:", err)

                                })
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

        genrateAdsenseExcel: combineResolvers(isAuthenticated, (parent, { input }, { models, me }) => {

            return new Promise(async (resolve, reject) => {

                const filter = JSON.parse(input)

                if (me?.isAdmin) {
                    try {
                        const reports = { YEAR_TO_DATE: await getFullReport("YEAR_TO_DATE", filter?.site, filter?.countrycode) }
                        const renamedData = reports?.YEAR_TO_DATE?.total?.map(item => ({
                            'Site': item.DOMAIN_NAME,
                            'Date': item.DATE,
                            'Country Code': item.COUNTRY_CODE,
                            'Country Name': item.COUNTRY_NAME,
                            'Impressions': item.IMPRESSIONS,
                            'Clicks': item.CLICKS,
                            'Page Views': item.PAGE_VIEWS,
                            'Estimated Earnings': item.ESTIMATED_EARNINGS,
                            'Page Views RPM': item.PAGE_VIEWS_RPM,
                            'Impressions RPM': item.IMPRESSIONS_RPM,
                            'Active View Viewability': item.ACTIVE_VIEW_VIEWABILITY
                        }));

                        const fileName = `${process.env.ASSETS_STORAGE}/${me?.id}.xlsx`;
                        const worksheet = XLSX.utils.json_to_sheet(renamedData);
                        const workbook = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
                        XLSX.writeFile(workbook, fileName);
                        resolve(fileName.replace(process.env.ASSETS_STORAGE, ""))

                    }
                    catch (error) {
                        console.log("🚀 ~ file: user.js:561 ~ returnnewPromise ~ error:", error)
                        reject(error)
                    }

                } else {
                    if (filter?.site?.length > 0) {
                        const sites = me?.showAllData ? [] : filter?.site;
                        try {
                            const reports = { YEAR_TO_DATE: await getFullReport("YEAR_TO_DATE", sites, filter?.countrycode) }
                            const renamedData = reports?.YEAR_TO_DATE?.total?.map(item => ({
                                'Site': item.DOMAIN_NAME,
                                'Date': item.DATE,
                                'Country Code': item.COUNTRY_CODE,
                                'Country Name': item.COUNTRY_NAME,
                                'Impressions': item.IMPRESSIONS,
                                'Clicks': item.CLICKS,
                                'Page Views': item.PAGE_VIEWS,
                                'Estimated Earnings': item.ESTIMATED_EARNINGS,
                                'Page Views RPM': item.PAGE_VIEWS_RPM,
                                'Impressions RPM': item.IMPRESSIONS_RPM,
                                'Active View Viewability': item.ACTIVE_VIEW_VIEWABILITY
                            }));

                            const fileName = `${process.env.ASSETS_STORAGE}/${me?.id}.xlsx`;
                            const worksheet = XLSX.utils.json_to_sheet(renamedData);
                            const workbook = XLSX.utils.book_new();
                            XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
                            XLSX.writeFile(workbook, fileName);
                            resolve(fileName.replace(process.env.ASSETS_STORAGE, ""))

                        }
                        catch (error) {
                            console.log("🚀 ~ file: user.js:583 ~ returnnewPromise ~ error:", error)
                            reject(error)
                        }
                    }
                    else {
                        reject("You Don't have any alloted site")
                    }


                }

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