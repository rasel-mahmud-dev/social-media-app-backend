import Base from "./Base";

class Message extends Base {
    static collectionName = "message";

    // _id  => database uuid

    static indexes = {
        groupId: {},
        senderId: {}
    }

    constructor({
                    senderId,
                    // recipientId,
                    message,
                    groupId,
                    // channelName,
                    isUpdated = false

                }) {
        super(Message.collectionName);
        this.senderId = senderId
        // this.recipientId = recipientId
        // this.channelName = channelName
        this.groupId = groupId
        this.message = message
        this.createdAt = new Date();
        this.updatedAt = new Date();
        this.isUpdated = isUpdated
    }
}

export default Message;


// Conversation Collection:

// _id: Unique identifier for the conversation.
// name: Name of the conversation (for group chats).
// type: Type of conversation (e.g., private, group).
// participants: Array of user references representing participants in the conversation.
// Other conversation-related fields as per your requirements.
// Message Collection:

// _id: Unique identifier for the message.
// conversationId: Reference to the conversation this message belongs to.
// senderId: Reference to the user who sent the message.
// content: Content of the message.
// timestamp: Timestamp indicating when the message was sent.
// Other message-related fields as per your requirements.

