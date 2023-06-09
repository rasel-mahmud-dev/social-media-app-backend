import Base from "./Base";

class Story extends Base {
    static collectionName = "story";

    // _id  => database uuid

// media {
//     "type": "image", // video
//     "url": "image_url_here"
// },

    constructor({
                media,
                content,
                likes = [], // love, haha, sad
                userId // ref
            }) {
        super(Story.collectionName);
        let now = new Date()
        now.setHours(1)
        this.content = content
        this.media = media
        this.likes = likes
        this.userId = userId
        this.expiredAt = now;
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }
}

export default Story;
