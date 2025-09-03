import mongoose from "mongoose";
import { combineResolvers } from "graphql-resolvers";
import { isAuthenticated, isAdmin } from "./authorization";
import { fileUpload } from "../functions/fileUpload";
import fs from "fs";
import { FilterQuery } from "../functions/generateFilterQuery";

export default {
    Query: {
        getMessageLog: (parent, { id }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.MessageLog.findOne({ _id: id, isDeleted: false }).then((res) => resolve(res))
                    .catch((error) => reject(error))
            })
        },

        getAllMessageLogs: (parent, args, { models, me }) => {
            return new Promise(async (resolve, reject) => {

                let Obj = {}
                if (args?.search !== "" && args?.search !== undefined && args?.search != null) {
                    const filterText = FilterQuery(args?.search, 'messageLogTbl')
                    Obj.$and = [
                        filterText
                    ]
                }

                Obj.isDeleted = false

                await models?.MessageLog.paginate(Obj, { page: args?.page, limit: args?.limit, sort: { _id: "-1" }, populate: 'messageId' })
                    .then((result) => resolve({ count: result?.total || 0, data: result?.docs || [] }))
                    .catch((error) => reject(error))
            })
        }
    },

    Mutation: {
        createMessageLog: (parent, { input }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.MessageLog.create(input).then((res) => resolve(res))
                    .catch((error) => reject(error))
            })
        },

        updateMessageLog: (parent, { input }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {

                await models?.MessageLog.findOneAndUpdate({ _id: input?.id, isDeleted: false }, input, { new: true })
                    .then((res) => resolve(res))
                    .catch((error) => reject(error))
            })
        },

        deleteMessageLog: (parent, { id }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.MessageLog.findOneAndUpdate({ _id: id, isDeleted: false }, { isDeleted: true }, { new: true }).then((res) => resolve(true))
                    .catch((error) => reject(error))
            })
        },
    }
}