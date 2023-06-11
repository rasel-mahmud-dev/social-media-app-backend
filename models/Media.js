import Base from "./Base";

class Media extends Base {
    static collectionName = "media";

    // _id  => database uuid

    static indexes = {
        userId: {}
    }


    constructor({
            type, // image/video/audio
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
