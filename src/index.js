import { makeExecutableSchema } from "@graphql-tools/schema";
import { ApolloServer, AuthenticationError } from "apollo-server-express";
import cors from "cors";
import { CronJob } from "cron";
import "dotenv/config";
import express from "express";
import { google } from "googleapis";
import { createServer } from "http";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import axios from "axios";
import { connectDB } from "./DB/index.js";
import models from "./models/index.js";
import resolvers from "./resolvers/index.js";
import Api from "./routes/index.js";
import typeDefs from "./schema/index.js";
import Socket from "./socket/index.js";
import { ApolloServerPluginLandingPageDisabled } from "apollo-server-core";
import moment from "moment";
import { AdsenseConvert } from "./functions/AdsenseConvert.js";
import { GenerateAdManagerReport } from "./functions/AdManagerReport.js";
import async from "async"
import fs from "fs"
import { generateRandomString } from "./functions/generateRandomString.js";
import { FourMonthBackup } from "./functions/siteTableBackup.js";
import { AdsenseTotal } from "./functions/AdsenseTotal.js";
// import AdManager from "./models/adManager.js";



let ObjectId = mongoose.Types.ObjectId;

const app = express();

// Add error handling for JSON parsing
app.use(express.json({
    limit: "100mb",
    verify: (req, res, buf, encoding) => {
        try {
            JSON.parse(buf);
        } catch (e) {
            console.error('JSON Parse Error:', e.message);
            res.status(400).json({
                success: false,
                message: 'Invalid JSON format',
                error: e.message
            });
        }
    }
}));

app.use(express.urlencoded({ extended: true, limit: "100mb" }));
app.use(cors());

// Add middleware to handle multipart/form-data requests that shouldn't be parsed as JSON
app.use((req, res, next) => {
    if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
        // Skip JSON parsing for multipart requests
        return next();
    }
    next();
});

app.use("/", express.static(process.env.ASSETS_STORAGE));
app.use('/api/v1', Api);

// Global error handler
app.use((error, req, res, next) => {
    console.error('Global Error Handler:', error);

    if (error.type === 'entity.parse.failed') {
        return res.status(400).json({
            success: false,
            message: 'Invalid JSON format in request body',
            error: error.message
        });
    }

    if (error.type === 'entity.too.large') {
        return res.status(413).json({
            success: false,
            message: 'Request entity too large',
            error: error.message
        });
    }

    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});











const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    // For testing, use localhost. For production, use your domain
    process.env.NODE_ENV === 'production' 
        ? `${process.env.CALLBACK_URL}/auth/callback`
        : `http://localhost:3001/auth/callback`,
);

console.log("OAuth callback URL:", `${process.env.CALLBACK_URL}/auth/callback`);

app.get("/authorize/:token", async (req, res) => {

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: [
            // Google Ad Manager API (modern)
            // "https://www.googleapis.com/auth/dfatrafficking",
            // "https://www.googleapis.com/auth/dfareporting",
            "https://www.googleapis.com/auth/admanager",
            // AdSense read scope (for existing functionality)
            // "https://www.googleapis.com/auth/adsense.readonly"
        ],
        prompt: 'consent'
    });

    const { token } = req?.params;

    await models.User?.findOne({ adminToken: token })
        .then(async (response) => {
            await models.User?.findOneAndUpdate({ adminToken: response?.adminToken }, { $set: { adminToken: null } })
            res.redirect(authUrl);
            // fs.writeFile("redirect.json", JSON.stringify(authUrl));
        })
        .catch((err) => {
            return res.json({
                status: false,
                code: 403
            })
        })
});

app.get(`/auth/callback`, async (req, res) => {
    try {
        const code = req.query.code;
        const { tokens } = await oauth2Client.getToken(code);

        await models.AdManager?.findOneAndUpdate({ isDeleted: false }, tokens, { upsert: true, new: true })
            .then((result) => { oauth2Client.setCredentials(tokens) })
            .catch((err) => {
                console.log("Error saving tokens:", err);
                fs.writeFile("err.json", JSON.stringify(err));
            });

        // Try to generate Ad Manager report but don't block login if it fails
        try {
            const reportResult = await GenerateAdManagerReport();
            console.log("Report generation result:", reportResult);
        } catch (reportError) {
            console.log("Report generation failed but continuing login:", reportError);
            // Log the error but continue with login
            await models?.Applog?.create({
                title: "Auth Callback Report Error",
                logFor: JSON.stringify(reportError)
            }).catch(() => { });
        }

        // Always redirect to main URL even if report generation fails
        res.redirect(process.env.MAIN_WEB_URL);

    } catch (error) {
        console.log("Auth callback error:", error);
        // Log the error and redirect to main URL with error parameter
        res.redirect(`${process.env.MAIN_WEB_URL}?auth_error=true`);
    }
});

// cronTime: '* * * * *',
// const generateReport = CronJob.from({
//     cronTime: '0 * * * *',
//     onTick: async function () {
//         try {
//             console.log("Running scheduled Ad Manager report generation");
//             const result = await GenerateAdManagerReport();
//             console.log("Scheduled report generation result:", result);
//         } catch (error) {
//             console.log("Scheduled report generation failed:", error);
//             // Log the error but don't crash the application
//             await models?.Applog?.create({ 
//                 title: "Scheduled Report Error", 
//                 logFor: JSON.stringify(error) 
//             }).catch(() => {});
//         }
//     },
//     start: true,
//     timeZone: 'Asia/Kolkata'
// });

// generateReport;


// const fourMonth = CronJob.from({
//     cronTime: '0 0 * * *',
//     onTick: function () {
//         FourMonthBackup()
//     },
//     start: true,
//     timeZone: 'Asia/Kolkata'
// });

// Get list of Ad Manager networks (accounts)
app.get("/networks", async (req, res) => {
    try {
        const tokens = await models?.AdManager?.findOne({ isDeleted: false });
        if (!tokens) {
            return res.status(401).json({ error: "No Ad Manager tokens found" });
        }

        oauth2Client.setCredentials(tokens);
        
        const url = `https://admanager.googleapis.com/v1/networks`;
        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${tokens.access_token}`,
            },
        });

        console.log('Available Networks:', response.data);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching networks:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch networks' });
    }
});

app.get("/ads-manager-report", async (req, res) => {
    try {
        const result = await GenerateAdManagerReport();
        console.log("Ad Manager report generation result:", result);

        if (result && result.status === false) {
            // Report generation failed but with a known reason
            return res.status(400).json({
                status: false,
                message: result.message || "Report generation failed"
            });
        }

        return res.json({
            status: true,
            message: "Report generated successfully"
        });
    } catch (error) {
        console.log("Ad Manager report endpoint error:", error);
        // Log the error
        await models?.Applog?.create({
            title: "Ad Manager Report API Error",
            logFor: JSON.stringify(error)
        }).catch(() => { });

        res.status(500).json({
            status: false,
            message: "An unexpected error occurred",
            error: error.message
        });
    }
});



// app.get('/test', async (req, res) => {

//     // let user = new models.User({
//     //     userName: "admin",
//     //     email: "admin@demo.com",
//     //     password: "password",
//     //     role: "admin",
//     //     isAdmin: true,
//     // });
//     // await user.save()





//     // return res.json({
//     //     status: true,
//     // })
// })

ObjectId.prototype.valueOf = function () {
    return this.toString();
};

const getMe = async (req) => {
    const token = req?.headers["x-token"];

    if (token) {
        try {
            const me = await jwt.verify(token, process.env.SECRET);
            switch (me?.type) {
                case "site":
                    const site = await models?.Site.findOne({ _id: me.id, isDeleted: false })
                    if (site) {
                        site.role = "client"
                        return site
                    }
                    return null
                case "user":
                    return await models?.User.findOne({ _id: me.id, email: me?.email, userName: me?.userName, isDeleted: false })
            }

        } catch (e) {
            throw new AuthenticationError("Session is expired or invalid, Please sign in again.");
        }
    }
};

async function startServer() {

    const httpServer = createServer(app);

    const schema = makeExecutableSchema({
        typeDefs,
        resolvers,
    });

    const server = new ApolloServer({
        schema,
        formatError: (error) => {
            const message = error.message
                .replace("SequelizeValidationError: ", "")
                .replace("Validation error: ", "")
                .replace("Unexpected error value: ", "")
                .replace("Context creation failed: ", "");

            return { ...error, message };
        },
        formatResponse: (response) => response,
        context: async ({ req, connection, res }) => {
            if (connection) {
                return {
                    models,
                };
            }
            if (req) {
                const me = await getMe(req);
                return {
                    models,
                    me,
                    secret: process.env.SECRET,
                };
            }
        },
        plugins: [
            {
                async serverWillStart() {
                    return {
                        async drainServer() {
                            // subscriptionServer.close();
                        },
                    };
                },
            },
            // ApolloServerPluginLandingPageDisabled(),
        ],
    });

    // const subscriptionServer = SubscriptionServer.create(
    //     {
    //         schema,
    //         execute,
    //         subscribe,
    //         onConnect() { },
    //     },
    //     {
    //         server: httpServer,
    //         path: server.graphqlPath,
    //     }
    // );

    await server.start();
    // app.use(graphqlUploadExpress());
    server.applyMiddleware({ app });

    try {
        await connectDB();

        const serverGr = httpServer.listen(process.env.PORT, () => {
            console.log(`🚀 Server is now running on http://localhost:${process.env.PORT}/graphql`);
            console.log(`📊 GraphQL Playground available at http://localhost:${process.env.PORT}/graphql`);
        });

        // Socket.connectSocketServer(serverGr);
    } catch (error) {
        console.error("❌ Database connection failed:", error);
        process.exit(1);
    }
}

startServer();