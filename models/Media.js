import Base from "./Base";

class Media extends Base {
    static collectionName = "media";

    // _id  => database uuid

    constructor({
            type,
            url,
            userId, // ref
            feedId // ref
        }) {
        super(Media.collectionName);
        this.url = url
        this.feedId = feedId
        this.type = type
        this.userId = userId
        this.uploadDate = new Date()
    }
}


export default Media;
