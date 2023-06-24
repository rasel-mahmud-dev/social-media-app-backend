import Base from "./Base";

class Membership extends Base {

    static collectionName = "membership";

    // _id  => Unique identifier for the membership id

    static indexes = {
        userId: {}
    }

    joinedAt = new Date()
    userId = null
    role = "user" // // user || admin || moderator
    isActive = true
    lastActivityDate = new Date()

    constructor(data) {
        super(Membership.collectionName)
        this.userId = data.userId
        this.groupId = data.groupId
        this.role = data.role
    }
}


export default Membership