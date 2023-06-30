import Base from "./Base";
import {ObjectId} from "mongodb";

class Reels extends Base {
    static collectionName = "reels";

    // _id  => database uuid

    static indexes = {
        userId: {},
        status: {},
        pageId: {},
        groupId: {}
    }

    videoUrl = {
        360: "",
        1080: "",
        144: ""
    }

    meta = {
        duration: 0
    }
    userId = new ObjectId()
    caption = ""
    pageId = new ObjectId()
    groupId = new ObjectId()


    constructor({
                    userId,
                    views,
                    hashtags,
                    videoUrl,
                    mentions,
                    isDeleted,
                    isPrivate,
                    thumbnailUrl,
                    meta,
                    pageId,
                    groupId,
                    caption,
                }){
        super(Reels.collectionName);
        this.userId = userId
        this.pageId = pageId
        this.caption = caption
        this.videoUrl = videoUrl
        this.meta = meta
        this.groupId = groupId
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }
}

export default Reels;
