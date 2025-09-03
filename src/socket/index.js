import { Server } from "socket.io";
import models from "../models";
import jwt from "jsonwebtoken";
import webpush from "web-push";


const connectSocketServer = (server) => {

    const io = new Server(server, {
        cors: { origin: "*", methods: ["GET", "POST"], },
        perMessageDeflate: false,
        autoConnect: true
    });

    io.use((socket, next) => {
        try {
            let token = socket?.handshake?.auth?.token;

            jwt.verify(token, process.env.SECRET, async (err, decoded) => {
                await models.User.findOne({ _id: decoded?.id, isDeleted: false }).then((result) => {
                    socket.me = result;
                    next();
                })
            });
        } catch (e) {
            console.log("Error :-", "user is not connected");
        }
    });

    io.on("connection", async (socket) => {
        // console.log(`Connected : ${socket?.id}`);

        // if (Object.keys(socket?.me).length == 0) {
        if (socket?.me == null) {
            await models?.GameUser?.findOneAndUpdate({ userId: socket?.handshake?.auth?.userId, isDeleted: false },
                {
                    userId: socket?.handshake?.auth?.userId,
                    userIp: socket?.handshake?.auth?.userIp,
                    $push: { socketId: socket?.id },
                    online: true,
                    uUrl: socket?.handshake?.auth?.uUrl,
                    country_code: socket?.handshake?.auth?.cn
                },
                { upsert: true, new: true })
                .then(async (result) => {
                    socket.gameUser = result;
                    // if (!result?.city || !result?.region || !result?.country) {
                    //     await axios.get(`http://ip-api.com/json/${result?.userIp}`).then(async (response) => {
                    //         const userData = await models?.GameUser?.findOneAndUpdate({ userIp: result?.userIp },
                    //             {
                    //                 city: response?.data?.city,
                    //                 region: response?.data?.regionName,
                    //                 country: response?.data?.country
                    //             },
                    //             { new: true })
                    //     })
                    // } else {

                    // }

                }).catch(err => console.log(err))
        }

        const connectedUsers = io.of("/").sockets.size;

        await models?.User?.findOneAndUpdate({ _id: socket?.me?._id, isDeleted: false }, { $push: { socketId: socket?.id, online: true }, }, { new: true })
            .then(async (result) => {
                socket.me = result;
                await models?.User.findOne({ isAdmin: true }).then((res) => {
                    if (res) {
                        let result = res?.socketId;
                        let socketStId = [];
                        for (let i in result) {
                            socketStId.push(result?.[i]?.toString())
                        }
                        io.to(socketStId).emit('totalConnectUser', { data: connectedUsers });
                    }
                })
            });




        socket.on("admin send to all user", async (data) => {
            socket.broadcast.emit("hello user", data);
        })


        socket.on("getToUser", async (response) => {

            // const notification = JSON.stringify({
            //     title: response?.title,
            //     body: response?.description,
            // });

            // var vapidDetail;

            const res = await models?.Sites?.findOne({ site: response?.uUrl, isDeleted: false })

            const messageLog = await models?.MessageLog?.create({ messageId: res?.id, site: response?.uUrl });

            const notification = JSON.stringify({
                mId: messageLog?._id,
                title: response?.title,
                description: response?.description,
                url: response?.url,
                image: response?.image,
                icon: response?.icon
            });

            const subscription = {
                endpoint: socket?.gameUser?.fcmValue?.endPoint,
                keys: {
                    auth: socket?.gameUser?.fcmValue?.endPoint?.auth,
                    p256dh: socket?.gameUser?.fcmValue?.endPoint?.keys,
                },
            };

            const vapidDetails = {
                "publicKey": "BLnem28O8ZEfD0fVJ-gJjA1lwdEMzAxW6HtoD7vPSWipUvgs5lJVGXRJMz6as8nZi_4wM8QwJtIuNj1cPSKXDtw",
                "privateKey": "cYEeMPvwkcZOjVSsIwBlqyF4cOoBONmXLuL3Nk3-AXA",
                "subject": "mailto: <nik00.gajera@yahoo.in>"
            };

            const options = {
                TTL: 10000,
                vapidDetails: res?.vapidDetails
                // vapidDetails: vapidDetails
            };

            const singleGameUser = await models?.GameUser?.findOne({ userId: response?.userId, isDeleted: false });

            const userStatic = {
                "endpoint": "https://fcm.googleapis.com/fcm/send/dmvJYWCydfk:APA91bGA6b4ME9uFSnsU9Q2K0gz0lv2bAqdFM-QL951xd01SH6cbEGAU3OnGNklXT74ukF8899K_YYU9Y0mfdmTo9Hqo8DkPQgaN6sZsRo1RkInd0dsnwvPY0Bay_3wJ3qheB5R4HVX4",
                "expirationTime": null,
                "keys": {
                    "p256dh": "BA5jDjOOn_ftpM3XlcXWAbLztMV6FwxTyojxu6OdrYpvwT0La2eUsYZsBmpk-wuZj7tc1O0w63KWY5TfYmPcq2Q",
                    "auth": "Ou29GSk8vj7FP813wh6E5A"
                }
            }

            // socket.emit("sendToUser", webpush.sendNotification(userStatic, notification, options)
            socket.emit("sendToUser", webpush.sendNotification(singleGameUser?.fcmValue, notification, options)
                .then(result => {
                    console.log(`Result: ${result.statusCode}`);
                })
                .catch(error => {
                    console.log(`Error: ${error} `);
                }))

        })

        socket.on("FcmToken", async (response) => {
            await models?.GameUser?.findOneAndUpdate({ userId: response?.userId, isDeleted: false }, {
                userId: response?.id,
                fcmValue: response?.subscriptionData,
            }, { upsert: true, new: true }).then((res) => {
                socket.gameUser = res;
                socket.emit("resFcmToken", { status: true })
            })
        })

        socket.on("siteMessage",async(data) => {
            // console.log("🚀 ~ file: index.js:165 ~ socket.on ~ data:", data)
           
        })

        socket.on("disconnect", async () => {

            await models?.GameUser?.findOneAndUpdate({ socketId: { $in: [socket?.id] }, isDeleted: false }, { $pull: { socketId: socket?.id }, online: false }, { upsert: true, new: true })
                .then((result) => {
                    socket.me = result;
                }).catch(err => console.log(err))

            await models?.User?.findOneAndUpdate({ socketId: { $in: [socket?.id] }, isDeleted: false }, { $pull: { socketId: socket?.id }, online: false })
        });
    })
}

export default { connectSocketServer }
