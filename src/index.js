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
import { connectDB } from "./DB";
import { GenerateAdsenseReport, GenerateAdManagerReport } from "./functions/GenerateAdsenseReport";
import models from "./models";
import resolvers from "./resolvers";
import Api from "./routes";
import typeDefs from "./schema";
import Socket from "./socket";
import { ApolloServerPluginLandingPageDisabled } from "apollo-server-core";
import moment from "moment";
import { AdsenseConvert } from "./functions/AdsenseConvert";
import async from "async"
import { GenerateAdsenseReportObj } from "./functions/GenerateObj";
import fs from "fs"
import { generateRandomString } from "./functions/generateRandomString";
import { FourMonthBackup } from "./functions/siteTableBackup";
import { AdsenseTotal } from "./functions/AdsenseTotal";



let ObjectId = mongoose.Types.ObjectId;

const app = express();
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));
app.use(cors());
app.use("/", express.static(process.env.ASSETS_STORAGE));
app.use('/api/v1', Api);











const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    // For testing, use localhost. For production, use your domain
    process.env.NODE_ENV === 'production' 
        ? `${process.env.CALLBACK_URL}/auth/callback`
        : `http://localhost:3001/auth/callback`,
);

console.log(`${process.env.CALLBACK_URL}/auth/callback`);

app.get("/authorize/:token", async (req, res) => {

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: [
            // Google Ad Manager API (modern)
            // "https://www.googleapis.com/auth/dfatrafficking",
            // "https://www.googleapis.com/auth/dfareporting",
            "https://www.googleapis.com/auth/dfp",
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

        console.log("tokens", tokens);

        models?.AdManager?.findOneAndUpdate({ isDeleted: false }, tokens, { upsert: true, new: true })
            .then((res) => { oauth2Client.setCredentials(tokens) })
            .catch((err) => { fs.writeFile("err.json", JSON.stringify(err)) })

        // res.json({ status: "Token Sucessfully Generate" });
        
        // Switched to Ad Manager report generation
        await GenerateAdManagerReport();        
        res.redirect(process.env.MAIN_WEB_URL);

    } catch (error) {
        res.status(500).send(error);
    }
});

// cronTime: '* * * * *',
const generateReport = CronJob.from({
    cronTime: '0 * * * *',
    onTick: function () {
        GenerateAdManagerReport()
    },
    start: true,
    timeZone: 'Asia/Kolkata'
});

generateReport;


const fourMonth = CronJob.from({
    cronTime: '0 0 * * *',
    onTick: function () {
        FourMonthBackup()
    },
    start: true,
    timeZone: 'Asia/Kolkata'
});

// Get list of Ad Manager networks (accounts)
app.get("/networks", async (req, res) => {
    try {
        const tokens = await models?.Adsense?.findOne({ isDeleted: false });
        if (!tokens) {
            return res.status(401).json({ error: "No Ad Manager tokens found" });
        }

        oauth2Client.setCredentials(tokens);
        
        const dfp = google.dfareporting('v4');
        const result = await dfp.userProfiles.list({
            auth: oauth2Client,
        });

        console.log('Available Networks:', result.data);
        res.json(result.data);
    } catch (error) {
        console.error('Error fetching networks:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch networks' });
    }
});

app.get("/ads-manager-report", async (req, res) => {

    try {
        const result = await GenerateAdManagerReport();
        console.log("result", result)
        return res.json({ status: true })

    } catch (error) {
        res.status(500).json(error);
    }
});



app.get('/test', async (req, res) => {

    // let user = new models.User({
    //     userName: "admin",
    //     email: "admin@demo.com",
    //     password: "password",
    //     role: "admin",
    //     isAdmin: true,
    // });
    // await user.save()





    // return res.json({
    //     status: true,
    // })
})

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
                    const site = await models?.Site.findById(me.id)
                    site.role = "client"
                    return site
                case "user":
                    return await models?.User.findOne({ _id: me.id, email: me?.email, userName: me?.userName })
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

    connectDB().then(() => {
        const serverGr = httpServer.listen(process.env.PORT, () =>
            // httpServer.listen(process.env.PORT, () =>
            console.log(`Server is now running on http://localhost:${process.env.PORT}/graphql`)
        );

        // Socket.connectSocketServer(serverGr);
    }).catch((error) => {
        console.log(`🚀 ~ file: index.js:121 ~ connectDB ~ error:`, error)
    })
}

startServer();