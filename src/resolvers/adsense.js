import { combineResolvers } from "graphql-resolvers";
import { isAdmin, isAuthenticated } from "./authorization";

export default {
    Query: {
        getAdsense: combineResolvers(isAuthenticated, (parent, { id }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.Adsense?.findOne({ _id: id, isDeleted: false }).then((res) => resolve(res))
                    .catch((error) => reject(error))
            })
        }),

        getAllAdsenses: combineResolvers(isAuthenticated, (parent, args, { models, me }) => {
            return new Promise(async (resolve, reject) => {
                let Obj = {}

                Obj.isDeleted = false

                await models?.Adsense?.paginate(Obj, { page: args?.page, limit: args?.limit, sort: { _id: "-1" } })
                    .then((result) => resolve({ count: result?.total || 0, data: result?.docs || [] }))
                    .catch((error) => reject(error))

            })
        })
    },

    Mutation: {
        createAdsense: combineResolvers(isAdmin, (parent, { input }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.Adsense?.create(input)
                    .then((res) => resolve(res))
                    .catch((error) => reject(error))
            })
        }),

        updateAdsense: combineResolvers(isAdmin, (parent, { input }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.Adsense?.findOneAndUpdate({ _id: input?.id, isDeleted: false }, input, { new: true })
                    .then((res) => resolve(res))
                    .catch((error) => reject(error))
            })
        }),

        deleteAdsense: combineResolvers(isAdmin, (parent, { id }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.Adsense?.findOneAndUpdate({ _id: id, isDeleted: false }, { isDeleted: true }, { new: true }).then((res) => resolve(true))
                    .catch((error) => reject(error))
            })
        }),
    }
}