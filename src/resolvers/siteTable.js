import mongoose from "mongoose";
import { combineResolvers } from "graphql-resolvers";
import { isAuthenticated, isAdmin } from "./authorization.js";
import { FilterQuery } from "../functions/generateFilterQuery.js";
import { GenerateSiteTableObj } from "../functions/GenerateObj.js";
import async from "async";
import moment from "moment";
import { getRangeReport, getReport } from "../functions/GenerateAdsenseReport.js";
import { ObjectId } from 'mongodb';


export default {
    Query: {
        getSiteTable: combineResolvers(isAuthenticated, (parent, { site, page, limit, startDate, endDate, userId, siteId, fetchAll }, { models, me }, info) => {


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
                        if (site) { aggregation.push({ $match: { "siteData.site": site } }) }
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
                            clicks: 1,
                            siteData: 1
                        }
                    },
                    {
                        $facet: {
                            metadata: [{ $count: "total" }],
                            // data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
                            data: fetchAll ? [] : [{ $skip: (page - 1) * limit }, { $limit: limit }],
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

                await models?.SiteTable.aggregate(aggregation).then((result) => {

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

        getSiteReportSiteTable: combineResolvers(isAuthenticated, (parent, { page, limit, startDate, endDate, siteId, site }, { models, me }, info) => {


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

                if (me?.role == "client") {
                    models?.Site?.findOne({ _id: ObjectId(siteId) }).then((res) => {
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

                if (me?.role == "client") { aggregation.push({ $match: { "siteData.site": me?.site } }) }


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

                await models?.SiteTable.aggregate(aggregation).then((result) => {

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

        getAllSiteTables: combineResolvers(isAuthenticated, (parent, args, { models, me }) => {
            return new Promise(async (resolve, reject) => {

                let Obj = {}

                if (args?.search !== "" && args?.search !== undefined && args?.search != null) {
                    const filterText = FilterQuery(args?.search, 'SiteTableTbl')

                    Obj.$and = [
                        filterText
                    ]
                }
                Obj.isDeleted = false

                const oneWeekAgo = moment().local().subtract(1, 'weeks').toDate();
                const oneMonthAgoStart = moment().local().subtract(1, 'months').startOf('month').toDate();
                const oneMonthAgoEnd = moment().local().endOf('month').toDate();
                const startOfPreviousMonth = moment().local().clone().subtract(1, 'months').startOf('month').toDate();
                const endOfPreviousMonth = moment().local().clone().subtract(1, 'months').endOf('month').toDate();
                const startOfYesterday = moment().local().subtract(1, 'day').startOf('day').toDate();
                const endOfYesterday = moment().local().subtract(1, 'day').endOf('day').toDate();
                const previousMonthDate = moment().local().subtract(1, 'months');
                const twentyEightDaysAgo = moment().local().subtract(28, 'days').toDate();
                const monthAgo = moment().local().startOf('month').toDate();
                const startOfDay = moment().local().startOf('day').toDate();
                const endOfDay = moment().local().endOf('day').toDate();
                const startDate = new Date(args?.startDate)
                const endDate = new Date(args?.endDate)


                // if (args?.startDate !== "" && args?.startDate !== undefined && args?.startDate != null) {
                //     Obj.date = {
                //         $gte: startDate,
                //         $lte: endDate
                //     }
                // }

                if (args?.filter !== "" && args?.filter !== undefined && args?.filter != null) {

                    let filter = JSON.parse(args?.filter)
                    if (filter?.siteId) { Obj._id = ObjectId(filter?.siteId) }
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
                    }
                )

                await models?.SiteTable.aggregate(aggregation)?.then((result) => {
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

        getUserSiteTableReport: combineResolvers(isAuthenticated, (parent, args, { models, me }) => {
            return new Promise(async (resolve, reject) => {
                try {
                    const Obj = { isDeleted: false };

                    if (args?.search) {
                        const filterText = FilterQuery(args?.search, 'SiteTableTbl');
                        Obj.$and = [filterText];
                    }

                    const filter = JSON.parse(args?.filter || '{}');
                    if (filter?.siteId) Obj._id = ObjectId(filter.siteId);
                    if (filter?.sitename) Obj.site = filter.sitename;

                    await models.SiteTable.createIndexes([
                        { site: 1 },
                        { isDeleted: 1 },
                        { date: -1 },
                    ]);

                    if (filter?.site?.length > 0) {
                        Obj.site = { $in: filter.site };
                    } else {
                        const sites = await models?.Site?.find({ userId: me?.id }).distinct("site");
                        Obj.site = { $in: sites };
                    }

                    const oneWeekAgo = moment().subtract(1, 'weeks').toDate();
                    const startOfPreviousMonth = moment().clone().subtract(1, 'months').startOf('month').toDate();
                    const endOfPreviousMonth = moment().clone().subtract(1, 'months').endOf('month').toDate();
                    const startOfYesterday = moment().subtract(1, 'day').startOf('day').toDate();
                    const endOfYesterday = moment().subtract(1, 'day').endOf('day').toDate();
                    const twentyEightDaysAgo = moment().subtract(28, 'days').toDate();
                    const monthAgo = moment().startOf('month').toDate();
                    const startOfDay = moment().startOf('day').toDate();
                    const endOfDay = moment().endOf('day').toDate();
                    const startDate = args?.startDate ? new Date(args?.startDate) : null;
                    const endDate = args?.endDate ? new Date(args?.endDate) : null;

                    const page = args?.page || 1;
                    const limit = args?.limit || 10;



                    const data = await models.SiteTable.find(Obj)
                        .sort({ date: -1 })
                        .skip((page - 1) * limit)
                        .limit(limit)
                        .select({
                            id: 1,
                            site: 1,
                            date: 1,
                            estimatedEarning: 1,
                            pageViews: 1,
                            pageRpm: 1,
                            impressions: 1,
                            impressionsRpm: 1,
                            activeViewViewable: 1,
                            clicks: 1,
                        });

                    const total = await models.SiteTable.countDocuments(Obj);

                    const last7DaysTotal = await models.SiteTable.find({
                        ...Obj,
                        date: { $gte: oneWeekAgo },
                    }).select("estimatedEarning");

                    const todayTotal = await models.SiteTable.find({
                        ...Obj,
                        date: { $gte: startOfDay, $lte: endOfDay },
                    }).select("estimatedEarning");

                    const last28DaysTotal = await models.SiteTable.find({
                        ...Obj,
                        date: { $gte: twentyEightDaysAgo },
                    }).select("estimatedEarning");

                    const lastMonthTotal = await models.SiteTable.find({
                        ...Obj,
                        date: { $gte: monthAgo },
                    }).select("estimatedEarning");

                    const yesterDayTotal = await models.SiteTable.find({
                        ...Obj,
                        date: { $gte: startOfYesterday, $lte: endOfYesterday },
                    }).select("estimatedEarning");

                    const dataBetweenTwoDates = startDate && endDate
                        ? await models.SiteTable.find({
                            ...Obj,
                            date: { $gte: startDate, $lte: endDate },
                        }).select("estimatedEarning")
                        : [];

                    const previousMonthTotal = await models.SiteTable.find({
                        ...Obj,
                        date: { $gte: startOfPreviousMonth, $lte: endOfPreviousMonth },
                    }).select("estimatedEarning");

                    const calculateSum = (dataArray) =>
                        dataArray.reduce((sum, item) => sum + (item.estimatedEarning || 0), 0);

                    resolve({
                        count: total,
                        data: data,
                        sumMonth: calculateSum(lastMonthTotal),
                        sumWeek: calculateSum(last7DaysTotal),
                        sumYesterDay: calculateSum(yesterDayTotal),
                        sum28Day: calculateSum(last28DaysTotal),
                        sumToday: calculateSum(todayTotal),
                        sumOfTwoDates: calculateSum(dataBetweenTwoDates),
                        previousMonthTotal: calculateSum(previousMonthTotal),
                    });
                } catch (error) {
                    reject(error);
                }
            });
        }),

        // getUserSiteTableReport: combineResolvers(isAuthenticated, (parent, args, { models, me }) => {
        //     return new Promise(async (resolve, reject) => {

        //         let Obj = {}

        //         if (args?.search !== "" && args?.search !== undefined && args?.search != null) {
        //             const filterText = FilterQuery(args?.search, 'SiteTableTbl')
        //             Obj.$and = [filterText]
        //         }
        //         Obj.isDeleted = false

        //         const oneWeekAgo = moment().subtract(1, 'weeks').toDate();
        //         const startOfPreviousMonth = moment().clone().subtract(1, 'months').startOf('month').toDate();
        //         const endOfPreviousMonth = moment().clone().subtract(1, 'months').endOf('month').toDate();
        //         const startOfYesterday = moment().subtract(1, 'day').startOf('day').toDate();
        //         const endOfYesterday = moment().subtract(1, 'day').endOf('day').toDate();
        //         const twentyEightDaysAgo = moment().subtract(28, 'days').toDate();
        //         const monthAgo = moment().startOf('month').toDate();
        //         const startOfDay = moment().startOf('day').toDate();
        //         const endOfDay = moment().endOf('day').toDate();
        //         const startDate = args?.startDate ? new Date(args?.startDate) : null;
        //         const endDate = args?.endDate ? new Date(args?.endDate) : null;


        //         // if (args?.startDate !== "" && args?.startDate !== undefined && args?.startDate != null) {
        //         //     Obj.date = {
        //         //         $gte: startDate,
        //         //         $lte: endDate
        //         //     }
        //         // }

        //         let filter = JSON.parse(args?.filter)
        //         if (filter?.siteId) { Obj._id = ObjectId(filter?.siteId) }
        //         if (filter?.sitename) { Obj.site = filter?.sitename }

        //         await models.SiteTable.createIndexes([
        //             { site: 1 },
        //             { isDeleted: 1 },
        //             { date: -1 },
        //         ]);

        //         if (filter?.site?.length > 0) {
        //             Obj.site = { $in: filter?.site }
        //         }
        //         else {
        //             const sites = await models?.Site?.find({ userId: me?.id })?.distinct("site")
        //             Obj.site = { $in: sites }
        //         }

        //         let aggregation = [

        //             {
        //                 $match: Obj
        //             },
        //             { $sort: { date: -1 } },
        //             {
        //                 $project: {
        //                     id: "$_id",
        //                     site: 1,
        //                     date: 1,
        //                     estimatedEarning: 1,
        //                     pageViews: 1,
        //                     pageRpm: 1,
        //                     impressions: 1,
        //                     impressionsRpm: 1,
        //                     activeViewViewable: 1,
        //                     clicks: 1,
        //                 }
        //             },
        //             {
        //                 $facet: {
        //                     metadata: [{ $count: "total" }],
        //                     data: [{ $skip: (args.page - 1) * args.limit }, { $limit: args.limit }],
        //                     last7DaysTotal: [
        //                         {
        //                             $match: {
        //                                 "date": {
        //                                     $gte: oneWeekAgo
        //                                 }
        //                             }
        //                         },
        //                         {
        //                             $group: {
        //                                 _id: null,
        //                                 sumWeek: {
        //                                     $sum: "$estimatedEarning"
        //                                 },
        //                                 count: { $sum: 1 }
        //                             }
        //                         },
        //                     ],
        //                     todayTotal: [
        //                         {
        //                             $match: {
        //                                 "date": {
        //                                     $gte: startOfDay,
        //                                     $lte: endOfDay
        //                                 }
        //                             }
        //                         },
        //                         {
        //                             $group: {
        //                                 _id: null,
        //                                 sumToday: {
        //                                     $sum: "$estimatedEarning"
        //                                 },
        //                                 count: { $sum: 1 }
        //                             }
        //                         },
        //                     ],
        //                     last28DaysTotal: [
        //                         {
        //                             $match: {
        //                                 "date": {
        //                                     $gte: twentyEightDaysAgo
        //                                 }
        //                             }
        //                         },
        //                         {
        //                             $group: {
        //                                 _id: null,
        //                                 sum28Days: {
        //                                     $sum: "$estimatedEarning"
        //                                 },
        //                                 count: { $sum: 1 }
        //                             }
        //                         },
        //                     ],
        //                     lastMonthTotal: [
        //                         {
        //                             $match: {
        //                                 "date": {
        //                                     $gte: monthAgo
        //                                 }
        //                             }
        //                         },
        //                         {
        //                             $group: {
        //                                 _id: null,
        //                                 sumMonth: {
        //                                     $sum: "$estimatedEarning"
        //                                 },
        //                                 count: { $sum: 1 }
        //                             }
        //                         }
        //                     ],
        //                     yesterDayTotal: [
        //                         {
        //                             $match: {
        //                                 "date": {
        //                                     $gte: startOfYesterday,
        //                                     $lte: endOfYesterday
        //                                 }
        //                             }
        //                         },
        //                         {
        //                             $group: {
        //                                 _id: null,
        //                                 sumYesterday: {
        //                                     $sum: "$estimatedEarning"
        //                                 },
        //                                 count: { $sum: 1 }
        //                             }
        //                         }
        //                     ],
        //                     dataBetweenTwoDates: [
        //                         {
        //                             $match: {
        //                                 "date": {
        //                                     $gte: startDate,
        //                                     $lte: endDate
        //                                 }
        //                             }
        //                         },
        //                         {
        //                             $group: {
        //                                 _id: null,
        //                                 sumOfTwoDates: {
        //                                     $sum: "$estimatedEarning"
        //                                 },
        //                                 count: { $sum: 1 }
        //                             }
        //                         }
        //                     ],
        //                     previousMonthTotal: [
        //                         {
        //                             $match: {
        //                                 "date": {
        //                                     $gte: startOfPreviousMonth,
        //                                     $lte: endOfPreviousMonth
        //                                 }
        //                             }
        //                         },
        //                         {
        //                             $group: {
        //                                 _id: null,
        //                                 sumMonth: {
        //                                     $sum: "$estimatedEarning"
        //                                 },
        //                                 count: { $sum: 1 }
        //                             }
        //                         }
        //                     ],

        //                 },
        //             }
        //         ]
        //         await models?.SiteTable.aggregate(aggregation, { allowDiskUse: true }).explain("executionStats").then((result) => {
        //             resolve(({
        //                 count: result[0]?.metadata[0]?.total || 0,
        //                 data: result[0]?.data || [],
        //                 sumMonth: result[0]?.lastMonthTotal[0]?.sumMonth,
        //                 sumWeek: result[0]?.last7DaysTotal[0]?.sumWeek,
        //                 sumYesterDay: result[0]?.yesterDayTotal[0]?.sumYesterday,
        //                 sum28Day: result[0]?.last28DaysTotal[0]?.sum28Days,
        //                 sumToday: result[0]?.todayTotal[0]?.sumToday,
        //                 sumOfTwoDates: result[0]?.dataBetweenTwoDates[0]?.sumOfTwoDates,
        //                 previousMonthTotal: result[0]?.previousMonthTotal[0]?.sumMonth
        //             }))
        //         }).catch((error) => {
        //             reject(error)
        //         })
        //     })
        // }),

        getSiteTableReport: combineResolvers(isAdmin, (parent, args, { models, me }) => {
            return new Promise(async (resolve, reject) => {

                const filter = JSON.parse(args?.filter)

                try {

                    const reports = {};
                    const ranges = ['TODAY', 'YESTERDAY', 'LAST_7_DAYS', 'MONTH_TO_DATE',];

                    const reportPromises = ranges.map(range => getReport(range, false, filter?.sitename));

                    const rangePromises = await getRangeReport(filter?.sitename);

                    const yearPromises = await getReport("YEAR_TO_DATE", true, filter?.sitename);

                    const reportResults = await Promise.all(reportPromises);

                    reportResults.forEach((report, index) => { reports[ranges[index]] = report })

                    reports[`LAST_MONTH`] = rangePromises

                    reports[`YEAR_TO_DATE`] = yearPromises


                    resolve(reports)

                } catch (error) {
                    reject(error)
                }

            })
        }),

        // getDashBoardData: combineResolvers(isAuthenticated, (parent, args, { models, me }) => {
        //     return new Promise(async (resolve, reject) => {
        //         try {
        //             const Obj = { isDeleted: false };

        //             if (args?.search) {
        //                 const filterText = FilterQuery(args?.search, 'SiteTableTbl');
        //                 Obj.$and = [filterText];
        //             }

        //             const filter = JSON.parse(args?.filter || '{}');
        //             if (filter?.siteId) Obj._id = ObjectId(filter.siteId);
        //             if (filter?.sitename) Obj.site = filter.sitename;

        //             await models.SiteTable.createIndexes([
        //                 { site: 1 },
        //                 { isDeleted: 1 },
        //                 { date: -1 },
        //             ]);

        //             if (filter?.site?.length > 0) {
        //                 Obj.site = { $in: filter.site };
        //             } else {
        //                 const sites = await models?.Site?.find({ userId: me?.id }).distinct("site");
        //                 Obj.site = { $in: sites };
        //             }

        //             const startOfMonth = moment().startOf('month').toDate();
        //             const endOfMonth = moment().endOf('month').toDate();

        //             const page = args?.page || 1;
        //             const limit = args?.limit || 10;

        //             const data = await models.SiteTable.find({
        //                 ...Obj,
        //                 date: { $gte: startOfMonth, $lte: endOfMonth },
        //             })
        //                 .sort({ date: -1 })
        //                 .skip((page - 1) * limit)
        //                 .limit(limit)
        //                 .select({
        //                     id: 1,
        //                     site: 1,
        //                     date: 1,
        //                     estimatedEarning: 1,
        //                     pageViews: 1,
        //                     pageRpm: 1,
        //                     impressions: 1,
        //                     impressionsRpm: 1,
        //                     activeViewViewable: 1,
        //                     clicks: 1,
        //                 });

        //             const total = await models.SiteTable.countDocuments({
        //                 ...Obj,
        //                 date: { $gte: startOfMonth, $lte: endOfMonth },
        //             });

        //             const groupedByDate = await models.SiteTable.aggregate([
        //                 {
        //                     $match: {
        //                         ...Obj,
        //                         date: { $gte: startOfMonth, $lte: endOfMonth },
        //                     },
        //                 },
        //                 {
        //                     $group: {
        //                         _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
        //                         totalEarnings: { $sum: "$estimatedEarning" },
        //                         totalPageViews: { $sum: "$pageViews" },
        //                         totalClicks: { $sum: "$clicks" },
        //                     },
        //                 },
        //                 { $sort: { _id: 1 } },
        //             ]);

        //             resolve({
        //                 count: total,
        //                 data: data,
        //                 groupedByDate: groupedByDate,
        //             });
        //         } catch (error) {
        //             reject(error);
        //         }
        //     });

        // })
        getDashBoardData: combineResolvers(isAuthenticated, (parent, args, { models, me }) => {

            return new Promise(async (resolve, reject) => {

                try {
                    const siteData = await models.Site.findOne({ userId: me?.id }).distinct("site");

                    const Obj = { isDeleted: false };

                    if (!me?.isAdmin) { Obj.site = { $in: siteData } }

                    if (args?.search) {
                        const filterText = FilterQuery(args?.search, 'SiteTableTbl');
                        Obj.$and = [filterText];
                    }

                    const startDate = moment().subtract(31, 'days').toDate();
                    const endDate = moment().toDate();

                    const dailyData = await models.SiteTable.aggregate([
                        {
                            $match: {
                                ...Obj,
                                date: { $gte: startDate, $lte: endDate },
                            },
                        },
                        {
                            $group: {
                                _id: { $dateToString: { format: "%d-%m-%Y", date: "$date" } },
                                totalEarnings: { $sum: "$estimatedEarning" },
                            },
                        },
                        {
                            $sort: { _id: 1 },
                        },
                    ]);


                    const last30Days = Array.from({ length: 31 }, (_, i) =>
                        moment().subtract(31 - i, 'days').startOf('day').format("DD-MM-YYYY")
                    );
                    
                    const formattedData = last30Days?.map((date, index) => {
                        const record = dailyData.find(item => item?._id === date);
                        return {
                            date: date,
                            totalEstimatedEarning: record ? record?.totalEarnings : 0,
                        };
                    });

                    resolve(JSON.stringify(formattedData))
                }
                catch (error) {
                    reject(error)
                }
            })
        }),

    },

    Mutation: {
        createSiteTable: combineResolvers(isAdmin, (parent, { input }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.SiteTable.create(input).then((res) => resolve(res))
                    .catch((error) => reject(error))
            })
        }),

        updateSiteTable: combineResolvers(isAdmin, (parent, { input }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.SiteTable.findOneAndUpdate({ _id: input?.id, isDeleted: false }, input, { new: true }).then((res) => resolve(res))
                    .catch((error) => reject(error))
            })
        }),

        deleteSiteTable: combineResolvers(isAdmin, (parent, { id }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.SiteTable.findOneAndUpdate({ _id: id, isDeleted: false }, { isDeleted: true }, { new: true }).then((res) => resolve(true))
                    .catch((error) => reject(error))
            })
        }),

        importSiteTable: combineResolvers(isAdmin, (parent, { input }, { models, me }, info) => {

            return new Promise(async (resolve, reject) => {


                let counter = 0;
                async.eachSeries(
                    input,
                    async (data, cb) => {



                        let SiteTableData = GenerateSiteTableObj(data);

                        const dates = SiteTableData?.date;

                        if (typeof dates == "string" && dates?.includes("-")) {

                            const dateString = SiteTableData?.date;

                            const [day, month, year] = dateString?.split("-");

                            const moonLanding = new Date();
                            moonLanding.getFullYear()

                            const date = new Date(`${year}`, month - 1, day);
                            SiteTableData.date = date;

                            await models?.SiteTable?.findOneAndUpdate({ site: SiteTableData?.site, date, isDeleted: false }, SiteTableData, { upsert: true, new: true })
                                .then(async (result) => {
                                    counter++;
                                })
                        }
                        else {
                            reject("Date Type is Not Valid ")
                        }

                        if (cb) cb();
                    }, async (err) => {
                        if (err) reject(err?.message)
                        else if (input?.length === counter) {
                            await models?.Applog?.create({ title: info?.fieldName, userId: me?.id, logFor: "Upload Excel" })
                                .then((res) => {
                                    resolve("SiteTable import successfully");
                                }).catch((err) => {

                                })
                        }
                    }
                )
            })
        }),
    }
}
