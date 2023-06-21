
import Base from "./Base";

class Saved extends Base {
    static collectionName = "saved";

    // _id  => database uuid

    static indexes = {
        feedId: {},
        userId: {},
    }


    constructor({
            feedId,
            userId // ref
        }) {
        super(Saved.collectionName);
        this.feedId = feedId
        this.userId = userId
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }
}

export default Saved;
