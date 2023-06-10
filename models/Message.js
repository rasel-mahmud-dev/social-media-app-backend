import Base from "./Base";

class Message extends Base {
    static collectionName = "message";

    // _id  => database uuid

    constructor({
            senderId,
            recipientId,
            message,
            channelName,

        }) {
        super(Message.collectionName);
        this.senderId = senderId
        this.recipientId = recipientId
        this.channelName = channelName
        this.message = message
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }
}

export default Message;
