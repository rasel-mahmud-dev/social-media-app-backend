import Base from "./Base";

class Follow extends Base {
    static collectionName = "follow";

    // _id  => database uuid

    static indexes = {
        follower: {}, // who are follwing
        following: {}, // whom
    }

    constructor({
                    follower, // auth user
                    following, // ref  followed people
                    priority = 1, // 1=see first, 2 normal
                }) {
        super(Saved.collectionName);
        this.follower = follower
        this.following = following
        this.priority = priority;
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }
}

export default Follow;
