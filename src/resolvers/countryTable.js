import mongoose from "mongoose";
import { combineResolvers } from "graphql-resolvers";
import { isAuthenticated, isAdmin } from "./authorization.js";
import { FilterQuery } from "../functions/generateFilterQuery.js";
import { GenerateCountryTableObj } from "../functions/GenerateObj.js";
import async from "async";
import moment from "moment";
import { ObjectId } from 'mongodb';


export default {
    Query: {
        getCountryTable: combineResolvers(isAuthenticated, (parent, { site, page, limit, startDate, endDate, userId, siteId }, { models, me }, info) => {

            return new Promise(async (resolve, reject) => {

                let Obj = [{ isDeleted: false }]
                if (!me?.role == "client") Obj.push({ site })
                const oneWeekAgo = moment().subtract(1, 'weeks').toDate();

                const oneMonthAgoStart = moment().subtract(1, 'months').startOf('month').toDate();
                const oneMonthAgoEnd = moment().endOf('month').toDate();

                const startOfYesterday = moment().subtract(1, 'day').startOf('day').toDate();
                const endOfYesterday = moment().subtract(1, 'day').endOf('day').toDate();

                // const yesterdayStart = moment().subtract(1, 'day').startOf('day').toDate();
                // const yesterdayEnd = moment().endOf('day').toDate();

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

                if (!me?.isAdmin) {


                    if (me?.role == "client") {
                        models?.Site?.findOne({ site, userId: ObjectId(me?.id) }).then((res) => {
                            if (!res) reject("You Are Not Authenticate")
                        })
                    } else {
                        models?.Site?.findOne({ userId: { $in: me?.users } }).then((res) => {
                            if (!res) reject("You Are Not Authenticate")
                        })
                    }

                    aggregation.push({
                        $lookup:
                        {
                            from: "sites",
                            let: { "siteTbl": "$site" },

                            pipeline: [{
                                $match: { $expr: { $and: [{ $eq: ["$isDeleted", false] }, { $eq: ["$site", "$$siteTbl"] }] } }
                            }],
                            as: "siteData"
                        }
                    })

                    aggregation.push({ $unwind: { path: "$siteData", preserveNullAndEmptyArrays: true } })

                    if (me?.role == "client") { aggregation.push({ $match: { "siteData.site": site } }) }

                    else {
                        if (siteId) { aggregation.push({ $match: { "siteData._id": ObjectId(siteId) } }) }
                        if (userId) { aggregation.push({ $match: { "siteData.userId": ObjectId(userId) } }) }
                    }

                } else {
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

                    if (siteId) aggregation.push({ $match: { "siteData._id": ObjectId(siteId) } })
                    if (userId) aggregation.push({ $match: { "siteData.userId": ObjectId(userId) } })
                    if (site) aggregation.push({ $match: { "siteData.site": site } })

                }

                aggregation.push(
                    { $sort: { date: -1 } },
                    {
                        $project: {
                            id: "$_id",
                            site: 1,
                            date: 1,
                            estimatedEarning: 1,
                            pageViews: 1,
                            pageRpm: 1,
                            impressions: 1,
                            impressionsRpm: 1,
                            activeViewViewable: 1,
                            country: 1,
                            clicks: 1,
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

                await models?.CountryTable.aggregate(aggregation).then((result) => {

                    resolve(({
                        count: result[0]?.metadata[0]?.total || 0,
                        data: result[0]?.data || [],
                        sumMonth: result[0]?.lastMonthTotal[0]?.sumMonth,
                        sumWeek: result[0]?.last7DaysTotal[0]?.sumWeek,
                        sumYesterDay: result[0]?.yesterDayTotal[0]?.sumYesterday,
                        sum28Day: result[0]?.last28DaysTotal[0]?.sum28Days,
                        sumToday: result[0]?.todayTotal[0]?.sumToday,

                    }))
                }).catch((error) => reject(error))
            })
        }),

        getAllCountryTables: combineResolvers(isAuthenticated, (parent, args, { models, me }) => {
            return new Promise(async (resolve, reject) => {

                let Obj = {}

                if (args?.search !== "" && args?.search !== undefined && args?.search != null) {
                    const filterText = FilterQuery(args?.search, 'SiteTableTbl')

                    Obj.$and = [
                        filterText
                    ]
                }
                Obj.isDeleted = false

                const oneWeekAgo = moment().subtract(1, 'weeks').toDate();

                const oneMonthAgoStart = moment().subtract(1, 'months').startOf('month').toDate();
                const oneMonthAgoEnd = moment().endOf('month').toDate();

                const startOfPreviousMonth = moment().clone().subtract(1, 'months').startOf('month').toDate();
                const endOfPreviousMonth = moment().clone().subtract(1, 'months').endOf('month').toDate();

                const startOfYesterday = moment().subtract(1, 'day').startOf('day').toDate();
                const endOfYesterday = moment().subtract(1, 'day').endOf('day').toDate();

                const previousMonthDate = moment().subtract(1, 'months');

                const twentyEightDaysAgo = moment().subtract(28, 'days').toDate();

                const monthAgo = moment().startOf('month').toDate();

                const startOfDay = moment().startOf('day').toDate();
                const endOfDay = moment().endOf('day').toDate();

                const startDate = new Date(args?.startDate)
                const endDate = new Date(args?.endDate)
               

                if (args?.startDate !== "" && args?.startDate !== undefined && args?.startDate != null) {
                    Obj.date = {
                        $gte: startDate,
                        $lte: endDate
                    }
                }

                if (args?.filter !== "" && args?.filter !== undefined && args?.filter != null) {

                    let filter = JSON.parse(args?.filter)
                    if (filter?.country) { Obj.country = filter?.country }
                    if (filter?.sitename) { Obj.site = filter?.sitename }

                    if (filter?.site) { Obj.site = { $in: filter?.site } }
                }

                let aggregation = [
                    { $match: Obj }
                ];

                if (!me?.isAdmin) {

                    aggregation.push({
                        $lookup:
                        {
                            from: "sites",
                            let: { "siteTbl": "$site", "isDeleted": false },
                            pipeline: [{
                                $match: { $expr: { $and: [{ $eq: ["$isDeleted", "$$isDeleted"] }, { $eq: ["$site", "$$siteTbl"] }] } }
                            }],
                            as: "siteData"
                        }
                    })
                    aggregation.push({
                        $unwind: { path: "$siteData", preserveNullAndEmptyArrays: true }
                    })
                    aggregation.push({
                        $match: { "siteData.userId": me?.role == "client" ? ObjectId(me?.id) : { $in: me?.users } }
                    })

                }
                aggregation.push(
                    { $sort: { date: -1 } },
                    {
                        $project: {
                            id: "$_id",
                            site: 1,
                            date: 1,
                            estimatedEarning: 1,
                            pageViews: 1,
                            pageRpm: 1,
                            impressions: 1,
                            impressionsRpm: 1,
                            activeViewViewable: 1,
                            clicks: 1,
                            country: 1
                        }
                    },
                    {
                        $facet: {
                            metadata: [{ $count: "total" }],
                            data: [{ $skip: (args.page - 1) * args.limit }, { $limit: args.limit }],
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
                                            $gte: monthAgo
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
                            dataBetweenTwoDates: [
                                {
                                    $match: {
                                        "date": {
                                            $gte: startDate,
                                            $lte: endDate
                                        }
                                    }
                                },
                                {
                                    $group: {
                                        _id: null,
                                        sumOfTwoDates: {
                                            $sum: "$estimatedEarning"
                                        },
                                        count: { $sum: 1 }
                                    }
                                }
                            ],
                            previousMonthTotal: [
                                {
                                    $match: {
                                        "date": {
                                            $gte: startOfPreviousMonth,
                                            $lte: endOfPreviousMonth
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

                        },
                    })
                await models?.CountryTable.aggregate(aggregation).then((result) => {
                    resolve(({
                        count: result[0]?.metadata[0]?.total || 0,
                        data: result[0]?.data || [],
                        sumMonth: result[0]?.lastMonthTotal[0]?.sumMonth,
                        sumWeek: result[0]?.last7DaysTotal[0]?.sumWeek,
                        sumYesterDay: result[0]?.yesterDayTotal[0]?.sumYesterday,
                        sum28Day: result[0]?.last28DaysTotal[0]?.sum28Days,
                        sumToday: result[0]?.todayTotal[0]?.sumToday,
                        sumOfTwoDates: result[0]?.dataBetweenTwoDates[0]?.sumOfTwoDates,
                        previousMonthTotal: result[0]?.previousMonthTotal[0]?.sumMonth
                    }))
                }).catch((error) => reject(error))
            })
        }),
    },

    Mutation: {
        createCountryTable: combineResolvers(isAdmin, (parent, { input }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.CountryTable.create(input).then((res) => resolve(res))
                    .catch((error) => reject(error))
            })
        }),

        updateCountryTable: combineResolvers(isAdmin, (parent, { input }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.CountryTable.findOneAndUpdate({ _id: input?.id, isDeleted: false }, input, { new: true }).then((res) => resolve(res))
                    .catch((error) => reject(error))
            })
        }),

        deleteCountryTable: combineResolvers(isAdmin, (parent, { id }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.CountryTable.findOneAndUpdate({ _id: id, isDeleted: false }, { isDeleted: true }, { new: true }).then((res) => resolve(true))
                    .catch((error) => reject(error))
            })
        }),

        importCountryTable: combineResolvers(isAdmin, (parent, { input }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                let counter = 0;
                async.eachSeries(
                    input,
                    async (data, cb) => {


                        let CountryTableData = GenerateCountryTableObj(data);

                        const dates = CountryTableData?.date;

                        if (typeof dates == "string" && dates?.includes("-")) {

                            const dateString = CountryTableData?.date;

                            const [day, month, year] = dateString?.split("-");

                            const moonLanding = new Date();
                            moonLanding.getFullYear()

                            const date = new Date(`${year}`, month - 1, day);
                            CountryTableData.date = date;

                            await models?.CountryTable?.findOneAndUpdate({ site: CountryTableData?.site, date, country: CountryTableData?.country, isDeleted: false }, CountryTableData, { upsert: true, new: true })
                                .then(async (result) => {
                                    counter++;
                                })
                        }
                        else {
                            reject("Date Type does Not Valid ")
                        }


                        if (cb) cb();
                    }, async (err) => {
                        if (err) reject(err?.message)
                        else if (input?.length === counter) {
                            await models?.Applog?.create({ title: info?.fieldName, userId: me?.id, logFor: "Upload Excel" })
                                .then((res) => {
                                    resolve("CountryTable import successfully");
                                }).catch((err) => {

                                })
                        }
                    }
                )
            })
        }),
    }
}