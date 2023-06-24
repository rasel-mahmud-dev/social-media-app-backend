import Base from "src/models/Base";

class Notification extends Base {

    static collectionName = "notification"

    static indexes = {
        recipientId: {},
        senderId: {},
    }

    recipientId = ""
    message = ""
    notificationType = "" // feed, message, invitation
    timestamp = new Date()
    isRead = false
    link = ""
    metadata = {}
    groupId = ""
    senderId = "";

    constructor(data) {
        super(Notification.collectionName);

        this.recipientId = data.recipientId
        this.message = data.message
        this.notificationType = data.notificationType
        this.timestamp = data.timestamp
        this.isRead = data.isRead
        this.link = data.link
        this.metadata = data.metadata
        this.groupId = data.groupId
        this.senderId = data.senderId
    }
}

export default Notification
