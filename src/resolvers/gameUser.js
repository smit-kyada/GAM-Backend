
import { FilterQuery } from "../functions/generateFilterQuery.js";

export default {
    Query: {
        getGameUser: (parent, { }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.GameUser.find({ endTime: { $exists: false }, isDeleted: false })
                    .then((result) => {
                        return resolve({ count: result?.length || 0, data: result || [] })
                    })
                    .catch((error) => reject(error))
            })
        },

        getAllGameUsers: (parent, args, { models, me }) => {

            return new Promise(async (resolve, reject) => {
                let Obj = { isDeleted: false }

                if (args?.search !== "" && args?.search !== undefined && args?.search != null) {
                    const filterText = FilterQuery(args?.search, 'gameUserTbl')
                    Obj.$and = [
                        filterText
                    ]
                }

                if (args?.filter !== "" && args?.filter !== undefined && args?.filter != null) {
                    const filterData = JSON.parse(args?.filter)
                    if (filterData?.online === true) {
                        Obj.online = true
                    } else if (filterData?.online === false) {
                        Obj.online = false
                    }

                    if (filterData?.Subscribe === true) {
                        Obj.fcmValue = { $exists: true }
                    } else if (filterData?.Subscribe === false) {
                        Obj.fcmValue = { $exists: false }
                    }

                    if (filterData?.site) {
                        Obj.uUrl = filterData?.site
                    }
                }

                if (args?.endTime) {
                    Obj.endTime = { $exists: false }
                }

                await models?.GameUser.paginate(Obj, { page: args?.page, limit: args?.limit, sort: { _id: "-1" } })
                    .then((result) => resolve({ count: result?.total || 0, data: result?.docs || [] }))
                    .catch((error) => reject(error))
            })
        },

        getAllSubscribers: (parent, args, { models, me }) => {

            return new Promise(async (resolve, reject) => {

                let aggregation = [
                    {
                        $match: {
                            isDeleted: false,
                        }
                    },
                    {
                        $facet: {
                            metadata: [{ $count: "total" }],
                            totalSubscribers: [
                                {
                                    $match: {
                                        "fcmValue": { $exists: true }
                                    }
                                },
                                {
                                    $group: {
                                        _id: null,
                                        count: { $sum: 1 }
                                    }
                                },
                            ],
                        }
                    }
                ]

                await models?.GameUser.aggregate(aggregation)
                    .then((result) => resolve({
                        count: result[0]?.metadata[0]?.total || 0,
                        totalSubscribers: result[0]?.totalSubscribers[0]?.count || 0
                    }))
                    .catch((error) => reject(error))
            })
        },


    },

    Mutation: {
        createGameUser: (parent, { input }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.GameUser.create(input).then((res) => resolve(res))
                    .catch((error) => reject(error))
            })
        },

        updateGameUser: (parent, { input }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.GameUser.findOneAndUpdate({ _id: input?.id, isDeleted: false }, input, { new: true }).then((res) => resolve(res))
                    .catch((error) => reject(error))
            })
        },

        deleteGameUser: (parent, { id }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.GameUser.findOneAndUpdate({ _id: id, isDeleted: false }, { isDeleted: true }, { new: true }).then((res) => resolve(true))
                    .catch((error) => reject(error))
            })
        },
    }
}