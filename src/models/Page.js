import Base from "./Base";

class Page extends Base {

    static collectionName = "pages";

    // _id  => Unique identifier for the group id

    static indexes = {
        ownerId: {}
    }

    name = ""
    slug = ""
    coverPhoto = ""
    logo = ""
    createdAt = new Date()
    ownerId = null
    meta = {}


    constructor(data){
        super(Page.collectionName)
        this.name = data.name
        this.slug = data.slug
        this.coverPhoto = data.coverPhoto
        this.logo = data.logo
        this.bio = data.bio
        this.meta = data.meta
        this.ownerId = data.ownerId
        this.createdAt = new Date()
    }
}


export default Page