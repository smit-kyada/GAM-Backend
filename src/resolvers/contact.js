import { combineResolvers } from "graphql-resolvers";
import { FilterQuery } from "../functions/generateFilterQuery.js";
import { isAdmin } from "./authorization.js";

export default {
    Query: {
        getContact: combineResolvers(isAdmin, (parent, { id }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.Contact.findOne({ _id: id, isDeleted: false }).then((res) => resolve(res))
                    .catch((error) => reject(error))
            })
        }),

        getAllContacts: combineResolvers(isAdmin, (parent, args, { models, me }) => {
            return new Promise(async (resolve, reject) => {
                let Obj = {}

                if (args?.search !== "" && args?.search !== undefined && args?.search != null) {
                    const filterText = FilterQuery(args?.search, 'AffRequestTbl')
                    Obj.$and = [
                        filterText
                    ]
                }
                Obj.isDeleted = false

                await models?.Contact.paginate(Obj, { page: args?.page, limit: args?.limit, sort: { _id: "-1" } })
                    .then((result) => resolve({ count: result?.total || 0, data: result?.docs || [] }))
                    .catch((error) => reject(error))

            })
        })
    },

    Mutation: {
        createContact: combineResolvers((parent, { input }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.Contact.create(input)
                    .then((res) => resolve(res))
                    .catch((error) => reject(error))
            })
        }),

        updateContact: combineResolvers(isAdmin, (parent, { input }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.Contact.findOneAndUpdate({ _id: input?.id, isDeleted: false }, input, { new: true })
                    .then((res) => resolve(res))
                    .catch((error) => reject(error))
            })
        }),

        deleteContact: combineResolvers(isAdmin, (parent, { id }, { models, me }, info) => {
            return new Promise(async (resolve, reject) => {
                await models?.Contact.findOneAndUpdate({ _id: id, isDeleted: false }, { isDeleted: true }, { new: true }).then((res) => resolve(true))
                    .catch((error) => reject(error))
            })
        }),
    }
}