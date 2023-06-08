import Base from "./Base";

class Comment extends Base {
    static collectionName = "comment";

    // _id  => database uuid

    constructor({
                    comment,
                    feedId,
                    userId // ref
                }) {
        super("comment");
        this.comment = comment
        this.feedId = feedId
        this.userId = userId
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }
}

export default Comment;
