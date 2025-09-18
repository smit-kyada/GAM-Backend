import models from "../models/index.js";

// Backup
export const FourMonthBackup = async () => {
    try {

        try {
            await models.SiteTable.find({ createdAt: { $lt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120) } })
                .then(async (response) => {

                    // await models?.BackupSitetable?.deleteMany()
                    //     .then(async (res1) => {

                    await models?.BackupSitetable?.insertMany(response)
                        .then(async (_) => {
                            await models.SiteTable.deleteMany({ createdAt: { $lt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120) } })
                                .then(async (_) => { })
                                .catch(async (_) => { })
                        })
                        .catch((_) => { })
                    // })
                    // .catch((er) => {
                    //     console.log("🚀 ~ file: siteTableBackup.js:20 ~ .then ~ er:", er)
                    // })
                })
                .catch((err) => {
                    console.log("🚀 ~ file: index.js:182 ~ app.get ~ err:", err)
                })

        } catch (error) {
            console.log("🚀 ~ file: siteTableBackup.js:34 ~ FourMonthBackup ~ error:", error)
        }

    } catch (error) {
        console.log("🚀 ~ file: siteTableBackup.js:23 ~ FourMonthBackup ~ error:", error)
    }
}