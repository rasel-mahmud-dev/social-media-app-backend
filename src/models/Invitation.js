import Base from "src/models/Base";

class Invitation extends Base {

    static collectionName = "invitation"

    static indexes = {
        senderId: {},
        groupId: {},
        recipientId: {},
        status: {},
    }

    constructor(data) {
        super(Invitation.collectionName);

        this.senderId = data.senderId
        this.recipientId = data.recipientId
        this.groupId = data.groupId
        this.status = data?.status ?? "pending" // enum: ['pending', 'accepted', 'declined'],
        this.createdAt = data.createdAt
    }
}

export default Invitation
