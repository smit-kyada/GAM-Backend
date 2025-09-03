import mongoose from "mongoose";
import { combineResolvers } from "graphql-resolvers";
import { isAuthenticated, isAdmin } from "./authorization";
import { fileUpload } from "../functions/fileUpload";
import fs from "fs";
import { FilterQuery } from "../functions/generateFilterQuery";

export default {
    Query: {
        getMessage: (parent, { id }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.Message.findOne({ _id: id, isDeleted: false }).then((res) => resolve(res))
                    .catch((error) => reject(error))
            })
        },

        getAllMessages: (parent, args, { models, me }) => {
            return new Promise(async (resolve, reject) => {
                let Obj = {}
                if (args?.search !== "" && args?.search !== undefined && args?.search != null) {
                    const filterText = FilterQuery(args?.search, 'messageTbl')
                    Obj.$and = [
                        filterText
                    ]
                }

                Obj.isDeleted = false
                await models?.Message.paginate(Obj, { page: args?.page, limit: args?.limit, sort: { _id: "-1" } })
                    .then((result) => resolve({ count: result?.total || 0, data: result?.docs || [] }))
                    .catch((error) => reject(error))
            })
        }
    },

    Mutation: {
        createMessage: (parent, { input }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {

                if (input?.image) {
                    const fileName1 = fileUpload(input?.image)
                    input.image = fileName1
                }
                if (input?.icon) {
                    const fileName2 = fileUpload(input?.icon)
                    input.icon = fileName2
                }
                await models?.Message.create(input).then((res) => resolve(res))
                    .catch((error) => reject(error))
            })
        },

        updateMessage: (parent, { input }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {


                if (input?.image) {
                    const fileName1 = fileUpload(input?.image)
                    input.image = fileName1
                }
                if (input?.icon) {
                    const fileName2 = fileUpload(input?.icon)
                    input.icon = fileName2
                }

                if (input?.oldImage) {
                    fs.unlink(`ASSETS/${input?.oldImage}`, err => {
                    })
                }
                if (input?.oldIcon) {
                    fs.unlink(`ASSETS/${input?.oldIcon}`, err => {
                    })
                }
                await models?.Message.findOneAndUpdate({ _id: input?.id, isDeleted: false }, input, { new: true }).then((res) => resolve(res))
                    .catch((error) => reject(error))
            })
        },

        deleteMessage: (parent, { id }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.Message.findOneAndUpdate({ _id: id, isDeleted: false }, { isDeleted: true }, { new: true }).then((res) => resolve(true))
                    .catch((error) => reject(error))
            })
        },
    }
}