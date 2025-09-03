import { gql } from "apollo-server-express";

export default gql`

type NotificationMessage {
    id: ID
    title: String
    color: String
    isActive:Boolean
}

type NotificationMessageRes {
    count: Number
    data: [NotificationMessage]
}

input InNotificationMessage{
    title: String
    color: String
    isActive:Boolean
}

input UpNotificationMessage{
    id: ID
    title: String
    color: String
    isActive:Boolean
}

extend type Query {
    getNotificationMessage(id: ID): NotificationMessage
    getAllNotificationMessages(page: Number, limit: Number, isSearch: Boolean, filter: String, search: String):NotificationMessageRes
}

extend type Mutation {
    createNotificationMessage(input: InNotificationMessage):NotificationMessage
    updateNotificationMessage(input: UpNotificationMessage):NotificationMessage
    deleteNotificationMessage(id: ID):Boolean
}
`;