import { gql } from "apollo-server-express";

export default gql`

type MessageLog {
    id: ID
    messageId: Message
    click: Number
    site: String
}

type MessageLogRes {
    count: Number
    data: [MessageLog]
}

input InMessageLog{
    messageId: String
    click: Number
    site: String
}

input UpMessageLog{
    id: ID
    messageId: String
    click: Number
    site: String
}

extend type Query {
    getMessageLog(id: ID): MessageLog
    getAllMessageLogs(page: Number, limit: Number, isSearch: Boolean, filter: String, search: String): MessageLogRes
}

extend type Mutation {
    createMessageLog(input: InMessageLog): MessageLog
    updateMessageLog(input: UpMessageLog): MessageLog
    deleteMessageLog(id: ID): Boolean
}
`;