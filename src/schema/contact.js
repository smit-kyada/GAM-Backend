import { gql } from "apollo-server-express";

export default gql`

type Contact {
    id: ID
    name: String
    email: String
    message: String
}

type ContactRes {
    count: Number
    data: [Contact]
}

input InContact {
    name: String
    email: String
    message: String  
}

input InUpContact {
    id: ID
    name: String
    email: String
    message: String
}

extend type Query {
    getContact(id: ID): Contact
    getAllContacts(page: Number, limit: Number, isSearch: Boolean, filter: String, search: String):ContactRes
}

extend type Mutation {
    createContact(input: InContact):Contact
    updateContact(input: InUpContact):Contact
    deleteContact(id: ID):Boolean
}
`;