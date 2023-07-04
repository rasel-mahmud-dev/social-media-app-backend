import Base from "./Base";

class Group extends Base {

    static collectionName = "groups";

    // _id  => Unique identifier for the group id

    static indexes = {
        ownerId: {}
    }

    name = ""
    meta = {}
    slug = ""
    coverPhoto = ""
    description = ""
    privacySetting = {}
    createdAt = new Date()
    ownerId = null
    totalMember = 1
    tags = []
    isVerified = false
    isPublic = true

    constructor(data){
        super(Group.collectionName)
        this.name = data.name
        this.slug = data.slug
        this.meta = data.meta
        this.coverPhoto = data.coverPhoto
        this.description = data.description
        this.privacySetting = data.privacySetting
        this.ownerId = data.ownerId
        this.createdAt = new Date()
        this.tags = data.tags
        this.isVerified = data.isVerified
        this.isPublic = data.isPublic
    }
}


export default Group