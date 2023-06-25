import Base from "./Base";

class Feed extends Base {
    static collectionName = "feed";

    // _id  => database uuid

    static indexes = {
        userId: {},
        // userId: {},
    }

    constructor({
                    content,
                    images = [],
                    userTags = [],
                    userId, // ref
                    type = "user",
                    groupId // ref
                }) {
        super("feed");
        this.type = type // 'group' or 'user'
        this.groupId = groupId
        this.content = content
        this.images = images
        this.userId = userId
        this.userTags = userTags
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }
}

export default Feed;
