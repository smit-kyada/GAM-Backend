import { gql } from "apollo-server-express";

export default gql`

type Message {
    id: ID
    title: String
    description: String
    image:String
    icon:String
    url:String
}

type MessageRes {
    count: Number
    data: [Message]
}

input InMessage{
    title: String
    description: String
    image:String
    icon:String
    url:String
}

input UpMessage{
    id: ID
    title: String
    description: String
    image:String
    icon:String
    url:String
    oldImage: String
    oldIcon: String
}

extend type Query {
    getMessage(id: ID): Message
    getAllMessages(page: Number, limit: Number, isSearch: Boolean, filter: String, search: String):MessageRes
}

extend type Mutation {
    createMessage(input: InMessage):Message
    updateMessage(input: UpMessage):Message
    deleteMessage(id: ID):Boolean
}
`;