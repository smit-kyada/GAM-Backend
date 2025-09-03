import mongoose from "mongoose";
import { combineResolvers } from "graphql-resolvers";
import { isAuthenticated, isAdmin } from "./authorization";
import { FilterQuery } from "../functions/generateFilterQuery";
import { fileUpload } from "../functions/fileUpload";
import fs from "fs";
const { ObjectId } = require('mongodb');

export default {
    Query: {
        getAccount: combineResolvers(isAuthenticated, (parent, { id }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.Account.find({ userId: ObjectId(id), isDeleted: false })
                    .then((result) => {
                        return resolve({ data: result || [] })
                    })
                    .catch((error) => reject(error))
            })
        }),


        getAllAccounts: combineResolvers(isAuthenticated, (parent, args, { models, me }) => {
            return new Promise(async (resolve, reject) => {
                let Obj = {}

                if (args?.search !== "" && args?.search !== undefined && args?.search != null) {
                    const filterText = FilterQuery(args?.search, 'AccountTbl')
                    Obj.$and = [
                        filterText
                    ]
                }
                if (args?.filter !== "" && args?.filter !== undefined && args?.filter != null) {
                    const filterData = JSON.parse(args?.filter)
                    if (filterData?.userId) {
                        Obj.userId = filterData?.userId
                    }
                }

                Obj.isDeleted = false

                await models?.Account.paginate(Obj, { page: args?.page, limit: args?.limit, sort: { _id: "-1" }, populate: ['userId'] })
                    .then((result) => resolve({ count: result?.total || 0, data: result?.docs || [] }))
                    .catch((error) => reject(error))

            })
        })
    },

    Mutation: {
        createAccount: combineResolvers(isAuthenticated, (parent, { input }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {

                if (input?.GstCertificate) {
                    const fileName1 = fileUpload(input?.GstCertificate)
                    input.GstCertificate = fileName1
                }

                await models?.Account.create(input)
                    .then((res) => { resolve(res) })
                    .catch((error) => reject(error))
            })
        }),

        updateAccount: combineResolvers(isAuthenticated, (parent, { input }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {

                if (input?.active) {
                    await models?.Account.updateMany({ _id: { $ne: input?.id }, isDeleted: false }, { active: false })
                }

                if (input?.GstCertificate) {
                    const fileName1 = fileUpload(input?.GstCertificate)
                    input.GstCertificate = fileName1
                }

                if (input?.OldGstCertificate) {
                    fs.unlink(`ASSETS/${input?.OldGstCertificate}`, err => {
                    })
                }

                await models?.Account.findOneAndUpdate({ _id: input?.id, isDeleted: false }, input, { new: true })
                    .then((res) => resolve(res))
                    .catch((error) => reject(error))
            })
        }),

        deleteAccount: combineResolvers(isAuthenticated, (parent, { id }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.Account.findOneAndUpdate({ _id: id, isDeleted: false }, { isDeleted: true }, { new: true }).then((res) => resolve(true))
                    .catch((error) => reject(error))
            })
        }),
    }
}