import Base from "./Base";

class Group extends Base {

    static collectionName = "group";

    // _id  => Unique identifier for the conversation like roomName.

    static indexes = {
        participants: {}
    }

    constructor(data){
        super(Group.collectionName)
        this.name = data.name
        this.type = data.type || "private" // group
        this.participants = data.participants
    }

}


// name: Name of the conversation (for group chats).
// type: Type of conversation (e.g., private, group).
// participants: Array of user references representing participants in the conversation.


export default Group