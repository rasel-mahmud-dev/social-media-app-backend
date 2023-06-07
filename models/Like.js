import Base from "./Base";

class Like extends Base {
    static collectionName = "like";

    // _id  => database uuid

    constructor({
            feedId,
                    reaction = "like", // love, haha, sad
            userId // ref
        }) {
        super(Like.collectionName);
        this.feedId = feedId
        this.reaction = reaction
        this.userId = userId
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }
}

export default Like;
