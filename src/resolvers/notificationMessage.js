
import { FilterQuery } from "../functions/generateFilterQuery.js";

export default {
    Query: {
        getNotificationMessage: (parent, { id }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.NotificationMessage.findOne({ _id: id, isDeleted: false }).then((res) => resolve(res))
                    .catch((error) => reject(error))
            })
        },

        getAllNotificationMessages: (parent, args, { models, me }) => {
            return new Promise(async (resolve, reject) => {
                let Obj = {}
                if (args?.search !== "" && args?.search !== undefined && args?.search != null) {
                    const filterText = FilterQuery(args?.search, 'NotificationMessageTbl')
                    Obj.$and = [
                        filterText
                    ]
                }
                if (args?.filter !== "" && args?.filter !== undefined && args?.filter != null) {
                    const filterData = JSON.parse(args?.filter)
                    if (filterData?.isActive === true) {
                        Obj.isActive = true
                    } 
                }

                Obj.isDeleted = false
                await models?.NotificationMessage.paginate(Obj, { page: args?.page, limit: args?.limit, sort: { _id: "-1" } })
                    .then((result) => resolve({ count: result?.total || 0, data: result?.docs || [] }))
                    .catch((error) => reject(error))
            })
        }
    },

    Mutation: {
        createNotificationMessage: (parent, { input }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.NotificationMessage.create(input).then((res) => resolve(res))
                    .catch((error) => reject(error))
            })
        },

        updateNotificationMessage: (parent, { input }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.NotificationMessage.findOneAndUpdate({ _id: input?.id, isDeleted: false }, input, { new: true }).then((res) => resolve(res))
                    .catch((error) => reject(error))
            })
        },

        deleteNotificationMessage: (parent, { id }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.NotificationMessage.findOneAndUpdate({ _id: id, isDeleted: false }, { isDeleted: true }, { new: true }).then((res) => resolve(true))
                    .catch((error) => reject(error))
            })
        },
    }
}