import async from "async";
import { combineResolvers } from "graphql-resolvers";
import moment from "moment";
import { GenerateDeductionObj } from "../functions/GenerateObj.js";
import { FilterQuery } from "../functions/generateFilterQuery.js";
import { isAdmin, isAuthenticated } from "./authorization.js";
import { ObjectId } from 'mongodb';


export default {
    Query: {
        getDeduction: combineResolvers(isAuthenticated, (parent, { page, limit, startDate, endDate, }, { models, me }, info) => {

            return new Promise(async (resolve, reject) => {

                let Obj = [{ isDeleted: false }]

                const oneWeekAgo = moment().subtract(1, 'weeks').toDate();
                const oneMonthAgoStart = moment().subtract(1, 'months').startOf('month').toDate();
                const oneMonthAgoEnd = moment().endOf('month').toDate();
                const startOfYesterday = moment().subtract(1, 'day').startOf('day').toDate();
                const endOfYesterday = moment().subtract(1, 'day').endOf('day').toDate();
                const twentyEightDaysAgo = moment().subtract(28, 'days').toDate();
                const startOfDay = moment().startOf('day').toDate();
                const endOfDay = moment().endOf('day').toDate();



                if (startDate !== "" && startDate !== undefined && startDate != null) {
                    Obj.push({
                        date: {
                            $gte: new Date(startDate),
                            $lte: new Date(endDate)
                        }
                    })
                }

                let aggregation = [{ $match: { $and: Obj } }]

                aggregation.push(
                    {
                        $lookup: {
                            from: "sites",
                            let: { siteLink: "$site" },
                            pipeline: [
                                {
                                    $match: { $expr: { $and: [{ $eq: ["$isDeleted", false] }, { $eq: ["$site", "$$siteLink"] }] } }
                                }
                            ],
                            as: "siteData"
                        }
                    },
                    { $unwind: "$siteData" },
                )

                aggregation.push(
                    { $sort: { date: -1 } },
                    {
                        $project: {
                            id: "$_id",
                            site_link: 1,
                            date: 1,
                            deduction: 1,
                            siteData: 1
                        }
                    },
                    {
                        $facet: {
                            metadata: [{ $count: "total" }],
                            data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
                            last7DaysTotal: [
                                {
                                    $match: {
                                        "date": {
                                            $gte: oneWeekAgo
                                        }
                                    }
                                },
                                {
                                    $group: {
                                        _id: null,
                                        sumWeek: {
                                            $sum: "$estimatedEarning"
                                        },
                                        count: { $sum: 1 }
                                    }
                                },
                            ],
                            todayTotal: [
                                {
                                    $match: {
                                        "date": {
                                            $gte: startOfDay,
                                            $lte: endOfDay
                                        }
                                    }
                                },
                                {
                                    $group: {
                                        _id: null,
                                        sumToday: {
                                            $sum: "$estimatedEarning"
                                        },
                                        count: { $sum: 1 }
                                    }
                                },
                            ],
                            last28DaysTotal: [
                                {
                                    $match: {
                                        "date": {
                                            $gte: twentyEightDaysAgo
                                        }
                                    }
                                },
                                {
                                    $group: {
                                        _id: null,
                                        sum28Days: {
                                            $sum: "$estimatedEarning"
                                        },
                                        count: { $sum: 1 }
                                    }
                                },
                            ],
                            lastMonthTotal: [
                                {
                                    $match: {
                                        "date": {
                                            $gte: oneMonthAgoStart,
                                            $lte: oneMonthAgoEnd
                                        }
                                    }
                                },
                                {
                                    $group: {
                                        _id: null,
                                        sumMonth: {
                                            $sum: "$estimatedEarning"
                                        },
                                        count: { $sum: 1 }
                                    }
                                }
                            ],
                            yesterDayTotal: [
                                {
                                    $match: {
                                        "date": {
                                            $gte: startOfYesterday,
                                            $lte: endOfYesterday
                                        }
                                    }
                                },
                                {
                                    $group: {
                                        _id: null,
                                        sumYesterday: {
                                            $sum: "$estimatedEarning"
                                        },
                                        count: { $sum: 1 }
                                    }
                                }
                            ],
                        },
                    })

                await models?.Deduction.aggregate(aggregation).then((result) => {

                    resolve(({
                        count: result?.length || 0,
                        data: result || [],

                        // sumMonth: result[0]?.lastMonthTotal[0]?.sumMonth,
                        // sumWeek: result[0]?.last7DaysTotal[0]?.sumWeek,
                        // sumYesterDay: result[0]?.yesterDayTotal[0]?.sumYesterday,
                        // sum28Day: result[0]?.last28DaysTotal[0]?.sum28Days,
                        // sumToday: result[0]?.todayTotal[0]?.sumToday,

                    }))
                }).catch((error) => reject(error))
            })
        }),

        getAllDeduction: combineResolvers(isAuthenticated, (parent, args, { models, me }) => {
            return new Promise(async (resolve, reject) => {

                let Obj = { isDeleted: false }
                if (args?.search) { Obj.$and = [FilterQuery(args?.search, 'DeductionTbl')] }
                if (args?.startDate && args?.startDate) { Obj.date = { $gte: new Date(args?.startDate), $lte: new Date(args?.endDate) } }

                const aggregation = [
                    { $match: Obj },
                    {
                        $lookup: {
                            from: "sitetables",
                            let: { siteLink: "$site_link", siteDate: "$date" },
                            pipeline: [{ $match: { $expr: { $and: [{ $eq: ["$isDeleted", false] }, { $eq: ["$site", "$$siteLink"] }, { $eq: ["$date", "$$siteDate"] }] } } }],
                            as: "SiteTableData"
                        }
                    },
                    { $unwind: "$SiteTableData" },
                    { $sort: { date: -1 } },
                    {
                        $project: {
                            id: "$_id",
                            site_link: 1,
                            date: 1,
                            deduction: 1,
                            SiteTableData: "$SiteTableData.estimatedEarning"
                        }
                    },
                    {
                        $facet: {
                            metadata: [{ $count: "total" }],
                            data: [{ $skip: (args?.page - 1) * args?.limit }, { $limit: args?.limit }],
                            totalErnings: [{ $group: { _id: null, total: { $sum: "$SiteTableData" }, deduction: { $sum: "$deduction" } } }],
                        },
                    }
                ]

                await models?.Deduction.aggregate(aggregation)
                    .then((result) => {
                        resolve(({
                            count: result[0]?.metadata[0]?.total || 0,
                            data: result[0]?.data || [],
                            totalErnings: result[0]?.totalErnings[0]?.total,
                            totalDeduction: result[0]?.totalErnings[0]?.deduction,
                        }))
                    })
                    .catch((error) => { reject(error) })
            })
        }),



    },

    Mutation: {
        createDeduction: combineResolvers(isAdmin, (parent, { input }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.Deduction.create(input).then((res) => resolve(res))
                    .catch((error) => reject(error))
            })
        }),

        updateDeduction: combineResolvers(isAdmin, (parent, { input }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.Deduction.findOneAndUpdate({ _id: input?.id, isDeleted: false }, input, { new: true }).then((res) => resolve(res))
                    .catch((error) => reject(error))
            })
        }),

        deleteDeduction: combineResolvers(isAdmin, (parent, { id }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.Deduction.findOneAndUpdate({ _id: id, isDeleted: false }, { isDeleted: true }, { new: true }).then((res) => resolve(true))
                    .catch((error) => reject(error))
            })
        }),

        importDeduction: combineResolvers(isAdmin, (parent, { input }, { models, me }, info) => {

            return new Promise(async (resolve, reject) => {



                let counter = 0;
                async.eachSeries(
                    input,
                    async (data, cb) => {



                        let DeductionData = GenerateDeductionObj(data);

                        const dates = DeductionData?.date

                        if (typeof dates == "string" && dates?.includes("-")) {
                            const dateString = DeductionData?.date;
                            const [day, month, year] = dateString?.split("-");
                            const moonLanding = new Date();
                            moonLanding.getFullYear()

                            const date = new Date(`${year}`, month - 1, day);
                            DeductionData.date = date;

                            await models?.Deduction?.findOneAndUpdate({ site_link: DeductionData?.site_link, date, isDeleted: false }, DeductionData, { upsert: true, new: true })
                                .then(async (result) => { counter++; })
                        }
                        else { reject("Date Type does Not Valid ") }



                        if (cb) cb();

                    }, async (err) => {

                        if (err) reject(err?.message)

                        else if (input?.length === counter) {
                            await models?.Applog?.create({ title: info?.fieldName, userId: me?.id, logFor: "Upload Excel" })
                                .then((res) => { resolve("SiteTable import successfully") })
                                .catch((err) => { reject(err?.message) })
                        }
                    }
                )
            })
        }),
    }
}