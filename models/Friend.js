import Base from "./Base";

class Friend extends Base {
    static collectionName = "friend";

    // _id  => database uuid

    constructor({
            receiverId,
            senderId,
            status,
        }){
        super(Friend.collectionName);
        this.receiverId = receiverId
        this.senderId = senderId
        this.status = status
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }
}

export default Friend;
