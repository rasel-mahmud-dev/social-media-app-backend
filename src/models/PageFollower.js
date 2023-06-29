import Base from "./Base";

class PageFollower extends Base {
    static collectionName = "page_follower";

    // _id  => database uuid

    static indexes = {
        pageId: {},
        userId: {}
    }

    constructor({
                    pageId,
                    userId // ref
                }) {
        super(PageFollower.collectionName);
        this.pageId = pageId
        this.userId = userId
        this.createdAt = new Date()
    }
}

export default PageFollower;
