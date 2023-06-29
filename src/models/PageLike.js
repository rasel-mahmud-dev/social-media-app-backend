import Base from "./Base";

class PageLike extends Base {
    static collectionName = "page_like";

    // _id  => database uuid

    static indexes = {
        pageId: {},
        userId: {}
    }

    constructor({
                    pageId,
                    userId // ref
                }) {
        super(PageLike.collectionName);
        this.pageId = pageId
        this.userId = userId
        this.createdAt = new Date()
    }
}

export default PageLike;
