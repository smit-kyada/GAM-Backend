import { combineResolvers } from "graphql-resolvers";
import { FilterQuery } from "../functions/generateFilterQuery";
import { isAdmin, isAuthenticated } from "./authorization";

export default {
    Query: {
        getQueries: combineResolvers(isAuthenticated, (parent, { id }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.Queries.findOne({ _id: id, isDeleted: false })?.populate("userId")?.then((res) => resolve(res))
                    .catch((error) => reject(error))
            })
        }),

        getQueriesByUserId: combineResolvers(isAuthenticated, (parent, { id }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.Queries.findOne({ userId: id, isDeleted: false })?.populate("userId")?.then((res) => resolve(res))
                    .catch((error) => reject(error))
            })
        }),

        getAllQueries: combineResolvers(isAuthenticated, (parent, args, { models, me }) => {
            return new Promise(async (resolve, reject) => {
                let Obj = {}

                if (args?.search !== "" && args?.search !== undefined && args?.search != null) {
                    const filterText = FilterQuery(args?.search, 'AffRequestTbl')
                    Obj.$and = [
                        filterText
                    ]
                }
                Obj.isDeleted = false

                await models?.Queries.paginate(Obj, {
                    page: args?.page, limit: args?.limit, sort: { _id: "-1" },
                    populate: "userId"
                })
                    .then((result) => resolve({ count: result?.total || 0, data: result?.docs || [] }))
                    .catch((error) => reject(error))

            })
        })
    },

    Mutation: {
        createQueries: combineResolvers((parent, { input }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.Queries.create(input)
                    .then((res) => resolve(res))
                    .catch((error) => reject(error))
            })
        }),

        updateQueries: combineResolvers(isAuthenticated, (parent, { input }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.Queries.findOneAndUpdate({ _id: input?.id, isDeleted: false }, input, { new: true })
                    .then((res) => resolve(res))
                    .catch((error) => reject(error))
            })
        }),

        deleteQueries: combineResolvers(isAuthenticated, (parent, { id }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.Queries.findOneAndUpdate({ _id: id, isDeleted: false }, { isDeleted: true }, { new: true }).then((res) => resolve(true))
                    .catch((error) => reject(error))
            })
        }),
    }
}