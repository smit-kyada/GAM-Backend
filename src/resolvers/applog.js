import mongoose from "mongoose";
import { combineResolvers } from "graphql-resolvers";
import { isAuthenticated, isAdmin } from "./authorization";
import { FilterQuery } from "../functions/generateFilterQuery";

export default {
    Query: {
        getApplog: combineResolvers((parent, { id }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.Applog?.findOne({ _id: id, isDeleted: false }).populate('userId').then((res) => resolve(res))
                    .catch((error) => reject(error))
            })
        }),

        getLastApplog: combineResolvers((parent, { id }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.Applog?.findOne()?.sort({ $natural: -1 }).then((res) => resolve(res))
                    .catch((error) => reject(error))
            })
        }),

        getAllApplog: combineResolvers((parent, args, { models, me }) => {

            return new Promise(async (resolve, reject) => {
                let Obj = {}

                Obj.isDeleted = false

                await models?.Applog?.paginate(Obj, { page: args?.page, limit: args?.limit, sort: { _id: "-1" }, populate: ['userId'] })
                    .then((result) => resolve({ count: result?.total || 0, data: result?.docs || [] }))
                    .catch((error) => reject(error))
            })
        })
    },

    Mutation: {
        createApplog: combineResolvers((parent, { input }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.Applog?.create(input).then(async (res) => {
                    await res.populate('userId').then((result) => {
                        resolve(result)
                    })
                }).catch((error) => reject(error))
                    .catch((error) => reject(error))
            })
        }),


        deleteApplog: combineResolvers((parent, { id }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.Applog?.findOneAndUpdate({ _id: id, isDeleted: false }, { isDeleted: true }, { new: true }).then((res) => resolve(true))
                    .catch((error) => reject(error))
            })
        }),
    }
}