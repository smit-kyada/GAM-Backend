import { gql } from "apollo-server-express";

export default gql`

type Keys {
    p256dh: String
    auth:String
}

type FcmValue {
    endpoint: String
    expirationTime: String
    keys: Keys
}

type GameUser {
    id: ID
    userId: String
    socketId: [String]
    startTime: Date
    endTime:Date
    uUrl: String
    country_code:String
    online: Boolean
    fcmValue: FcmValue

}

type GameUserRes {
    count: Number
    totalSubscribers: Number
    data: [GameUser]
}

input InGameUser{
    userId: String
    socketId: [String]
    startTime: Date
    endTime:Date
    uUrl: String
    country_code:String
    online: Boolean
}

input UpGameUser{
    id: ID
    userId: String
    socketId: [String]
    startTime: Date
    endTime:Date
    uUrl: String
    country_code:String
    online: Boolean
}

extend type Query {
    getGameUser(id: ID): GameUserRes
    getAllGameUsers(page: Number, limit: Number, isSearch: Boolean, filter: String, search: String ,endTime: String):GameUserRes
    getAllSubscribers(page: Number, limit: Number, isSearch: Boolean, filter: String, search: String ,endTime: String):GameUserRes
}

extend type Mutation {
    createGameUser(input: InGameUser):GameUser
    updateGameUser(input: UpGameUser):GameUser
    deleteGameUser(id: ID):Boolean
}
`;