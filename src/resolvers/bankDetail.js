import mongoose from "mongoose";
import { combineResolvers } from "graphql-resolvers";
import { isAuthenticated, isAdmin } from "./authorization.js";
import { FilterQuery } from "../functions/generateFilterQuery.js";
import { ObjectId } from 'mongodb';


export default {
    Query: {
        getBankDetail: combineResolvers(isAuthenticated, (parent, { id }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.BankDetail.find({ userId: ObjectId(me.id), isDeleted: false })
                    .then((result) => {
                        return resolve({ data: result || [] })
                    })
                    .catch((error) => reject(error))
            })
        }),

        getAllBankDetails: combineResolvers(isAuthenticated, (parent, args, { models, me }) => {
            return new Promise(async (resolve, reject) => {
                let Obj = {}

                if (args?.search !== "" && args?.search !== undefined && args?.search != null) {
                    const filterText = FilterQuery(args?.search, 'BankDetailTbl')
                    Obj.$and = [
                        filterText
                    ]
                }
                Obj.isDeleted = false

                await models?.BankDetail.paginate(Obj, { page: args?.page, limit: args?.limit, sort: { _id: "-1" }, populate: ['userId'] })
                    .then((result) => resolve({ count: result?.total || 0, data: result?.docs || [] }))
                    .catch((error) => reject(error))

            })
        })
    },

    Mutation: {
        createBankDetail: combineResolvers(isAuthenticated, (parent, { input }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                input.userId = me.id
                await models?.BankDetail.create(input)
                    .then((res) => resolve(res))
                    .catch((error) => reject(error))
            })
        }),

        updateBankDetail: combineResolvers(isAuthenticated, (parent, { input }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.BankDetail.findOneAndUpdate({ _id: input?.id, isDeleted: false }, input, { new: true })
                    .then((res) => resolve(res))
                    .catch((error) => reject(error))
            })
        }),

        deleteBankDetail: combineResolvers(isAuthenticated, (parent, { id }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.BankDetail.findOneAndUpdate({ _id: id, isDeleted: false }, { isDeleted: true }, { new: true }).then((res) => resolve(true))
                    .catch((error) => reject(error))
            })
        }),
    }
}