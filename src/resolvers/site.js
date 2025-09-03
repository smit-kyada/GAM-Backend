import mongoose from "mongoose";
import { combineResolvers } from "graphql-resolvers";
import { isAuthenticated, isAdmin } from "./authorization";
import { FilterQuery } from "../functions/generateFilterQuery";
const { ObjectId } = require('mongodb');
import bcrypt from "bcryptjs";

export default {
    Query: {
        getSite: combineResolvers(isAuthenticated, (parent, { id }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.Site.find({ userId: id, isDeleted: false }).then((res) => resolve(res))
                    .catch((error) => reject(error))
            })
        }),

        getAllSites: combineResolvers(isAuthenticated, (parent, args, { models, me }) => {
            return new Promise(async (resolve, reject) => {

                let Obj = {}

                if (args?.search !== "" && args?.search !== undefined && args?.search != null) {
                    const filterText = FilterQuery(args?.search, 'siteTbl')
                    Obj.$and = [
                        filterText
                    ]

                }
                Obj.isDeleted = false

                if (!me?.isAdmin) {
                    if (me?.role == "client") { Obj.userId = ObjectId(me?.id) }
                    else { Obj.userId = { $in: me?.users } }
                }

                if (args?.filter !== "" && args?.filter !== undefined && args?.filter != null) {
                    const filterData = JSON.parse(args?.filter)
                    if (filterData?.site) {
                        Obj.site = filterData?.site
                    }
                }

                if (me?.isAdmin || (!me?.isAdmin && me?.showTotalGameUser)) {
                    let aggregation = [
                        {
                            $match: Obj
                        },
                        {
                            $lookup: {
                                from: "users",
                                localField: "userId",
                                foreignField: "_id",
                                as: "userId"
                            }
                        },
                        {
                            $unwind: { path: "$userId", preserveNullAndEmptyArrays: true }
                        },
                        {
                            $lookup: {
                                from: "gameusers",
                                let: { site: "$site" },
                                pipeline: [
                                    {
                                        $match:
                                        {
                                            $expr:
                                            {
                                                $and:
                                                    [
                                                        { $eq: ["$uUrl", "$$site"] },
                                                    ]
                                            }
                                        }
                                    },
                                    {
                                        $count: "TotalgameUsers"
                                    },
                                ],
                                as: "gameUsers"
                            }
                        },
                        {
                            $unwind: { path: "$gameUsers", preserveNullAndEmptyArrays: true }
                        },
                        {
                            $project: {
                                id: "$_id",
                                "userId.id": "$userId._id",
                                "userId.userName": "$userId.userName",
                                "userId.companyName": "$userId.companyName",
                                "userId.fName": "$userId.fName",
                                "userId.lName": "$userId.lName",
                                "userId.email": "$userId.email",
                                "userId.contact": "$userId.contact",
                                "userId.profileImg": "$userId.profileImg",
                                site: 1,
                                description: 1,
                                gameUsers: 1,
                                isActive: 1
                            }
                        },
                        { $sort: { id: -1 } },
                        {
                            $facet: {
                                metadata: [{ $count: "total" }],
                                data: [{ $skip: (args?.page - 1) * args?.limit }, { $limit: args?.limit }],

                            },
                        }
                    ]
                    await models?.Site.aggregate(aggregation).then((result) => {

                        resolve(({
                            count: result[0]?.metadata[0]?.total || 0,
                            data: result[0]?.data || [],
                        }))
                    }).catch((error) => reject(error))
                }


                await models?.Site.paginate(Obj, { page: args?.page, limit: args?.limit, sort: { _id: "-1" }, populate: ['userId'] })
                    .then((result) => resolve({ count: result?.total || 0, data: result?.docs || [] }))
                    .catch((error) => reject(error))

            })
        }),

        getAlotSiteBoolean: combineResolvers(isAuthenticated, (parent, args, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.Site.findOne({ userId: me?.id, isDeleted: false }).then((res) => {
                    if (res) {
                        resolve(false)
                    } else {
                        resolve(true)
                    }
                })
                    .catch((error) => reject(error))
            })
        }),


        getNotAllotedSite: combineResolvers(isAuthenticated, (parent, args, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.Site.find({ userId: { $exists: false }, isDeleted: false }).sort({
                    _id: "1"
                }).limit(3).then((res) => {
                    resolve(res)
                }).catch((error) => reject(error))
            })
        }),
    },

    Mutation: {
        createSite: combineResolvers(isAdmin, (parent, { input }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.Site.findOne({ site: input?.site, isDeleted: false }).then(async (res) => {
                    if (!res) {
                        await models?.Site.create(input).then((res) => resolve(res))
                            .catch((error) => reject(error))
                    } else {
                        reject("Link all ready exist")
                    }

                }).catch((error) => reject(error))

            })
        }),

        updateSite: combineResolvers(isAdmin, (parent, { input }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.Site.findOne({ site: input?.site, isDeleted: false }).then(async (res) => {
                    if (!res) {
                        await models?.Site.findOneAndUpdate({ _id: input?.id, isDeleted: false }, input, { new: true })
                            .then((res) => resolve(res))
                            .catch((error) => reject(error))
                    } else {
                        reject("Link all ready exist")
                    }

                }).catch((error) => reject(error))

            })
        }),
        updateUserSite: combineResolvers(isAuthenticated, (parent, { input }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {

                input.userId = me?.id

                await models?.Site.find({ _id: input?.id, isDeleted: false }).then(async (result) => {
                    if (result?.length <= 10) {
                        await models?.Site.findOneAndUpdate({ _id: input?.id, isDeleted: false }, input, { new: true })
                            .then((res) => resolve(res))
                            .catch((error) => reject(error))
                    } else {
                        reject("you have reach your 10 limit,Please contact admin")
                    }
                }).catch((error) => reject(error))

            })
        }),

        createSitePassword: combineResolvers((parent, { id, password }, { models, me, secret }) => {
            return new Promise(async (resolve, reject) => {

                const saltRounds = 10;
                let passwordBcrypt = await bcrypt.hash(password, saltRounds);
                await models?.Site.findOneAndUpdate({ _id: id }, { password: passwordBcrypt })
                    .then((data) => {
                        return resolve(true)
                    })
                    .catch((error) => {
                        return reject(error)
                    })
            })
        }),

        deleteSite: combineResolvers(isAdmin, (parent, { id }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.Site.findOneAndUpdate({ _id: id, isDeleted: false }, { isDeleted: true }, { new: true }).then((res) => resolve(true))
                    .catch((error) => reject(error))
            })
        }),
    }
}