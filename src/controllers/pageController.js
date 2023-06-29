import {ObjectId} from "mongodb";

import * as yup from "yup"
import formidable from "formidable";
import Group from "src/models/Group";
import imageKitUpload from "src/services/ImageKitUpload";
import Page from "src/models/Page";
import Feed from "src/models/Feed";
import PageLike from "src/models/PageLike";


function getPageLikeQuery(match = {}) {
    return PageLike.aggregate([
        {$match: match},
        {
            $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "user"
            }
        },
        {
            $unwind: {path: "$user"}
        },
        {
            $project: {
                user: {
                    avatar: 1,
                    fullName: 1
                },
                userId: 1,
                _id: 1
            }
        }
    ])
}

export async function getMyGroups(req, res, next) {
    try {
        let groups = await Group.find({
            ownerId: new ObjectId(req.user._id),
        })
        res.status(200).json({groups: groups})

    } catch (ex) {
        next(ex)
    }
}


export async function discoverPages(req, res, next) {
    try {
        let pages = await Page.find({
            ownerId: {
                $nin: [new ObjectId(req.user._id)]
            }
        })
        res.status(200).json({pages: pages})

    } catch (ex) {
        next(ex)
    }
}

// feeds for my pages
export async function getMyPages(req, res, next) {
    try {

        let {pageNumber = "1"} = req.query

        const limit = 3;

        pageNumber = Number(pageNumber)
        if (isNaN(pageNumber)) {
            pageNumber = 1
        }

        let pages = []

        pages = await Page.find({
            ownerId: new ObjectId(req.user._id)
        })

        res.status(200).json({pages: pages})

    } catch (ex) {
        next(ex)
    }
}


// create page
export async function createPage(req, res, next) {
    const form = formidable({multiple: false})
    form.parse(req, async function (err, fields, files) {
        try {
            const {name, bio, _id = "", category = ""} = fields

            let schema = yup.object({
                name: yup.string().required().max(100),
                category: yup.string().max(100)
            })

            await schema.validate({
                name,
                category
            })

            let isExist = await Page.findOne({name})
            if (isExist) return next("This name is already used in someone page")

            let payload = {
                name,
                ownerId: new ObjectId(req.user._id),
                bio,
                slug: name,
                coverPhoto: "",
                createdAt: new Date()
            }

            if (files?.coverPhoto) {
                let fileName = files?.coverPhoto.newFilename + "-" + files?.coverPhoto.originalFilename + ".jpg"
                try {
                    let result = await imageKitUpload(files?.coverPhoto?.filepath, fileName, "social-app")
                    if (result && result?.url) {
                        payload.coverPhoto = result.url
                    }
                } catch (ex) {

                }
            }

            if (files?.logo) {
                let fileName = files?.logo.newFilename + "-" + files?.logo.originalFilename + ".jpg"
                try {
                    let result = await imageKitUpload(files?.logo?.filepath, fileName, "social-app")
                    if (result && result?.url) {
                        payload.logo = result.url
                    }
                } catch (ex) {

                }
            }


            // create a room if there are not exist this room
            let result = await Page.updateOne({
                ownerId: payload.ownerId,
                _id: _id ? new ObjectId(_id) : new ObjectId()
            }, {
                $set: payload
            }, {
                upsert: true
            })


            res.status(201).json({message: "page has been created."})

        } catch (ex) {
            next(ex)
        }
    })
}


export async function getPageDetail(req, res, next) {
    try {

        const {pageName} = req.params
        console.log(pageName)
        if (!pageName) return next("Please provide page name")
        let pages = await Page.aggregate([
            {
                $match: {
                    name: pageName
                }
            }
        ])

        if (pages.length > 0) {
            res.status(200).json({page: pages[0]})
        } else {
            next("page not found")
        }
    } catch (ex) {
        next(ex)
    }
}


export async function getPagePosts(req, res, next) {
    try {

        const {pageName} = req.params

        if (!pageName) return next("Please provide page name")
        const page = await Page.findOne({name: pageName})
        if (!page) return next("This Page is not found")


        let posts = await Feed.aggregate([
            {
                $match: {
                    pageId: new ObjectId(page._id)
                }
            }, {
                $lookup: {
                    from: "pages",
                    localField: "pageId",
                    foreignField: "_id",
                    as: "page"
                }
            },
            {
                $unwind: {path: "$page"}
            }
        ])


        res.status(200).json({posts: posts})

    } catch (ex) {
        next(ex)
    }
}


export async function togglePageLike(req, res, next) {
    try {

        const {pageId} = req.body

        if (!pageId) return next("Please provide page id")

        const page = await Page.findOne({_id: new ObjectId(pageId)})
        if (!page) return next("This Page is not found")

        let result = await PageLike.deleteOne({
            pageId: new ObjectId(pageId),
            userId: new ObjectId(req.user._id)
        })

        if (result.deletedCount) {
            res.status(201).json({removed: true})
        } else {
            let result = await PageLike.insertOne({
                pageId: new ObjectId(pageId),
                userId: new ObjectId(req.user._id),
                createdAt: new Date()
            })

            if (result.insertedId) {
                let likes = await getPageLikeQuery({
                    _id: new ObjectId(result.insertedId)
                })
                res.status(201).json({
                    removed: false, like: likes[0]
                })
            } else {
                res.status(201).json({removed: true})
            }
        }
    } catch (ex) {
        next(ex)
    }
}

// get page likes
export async function getPageLikes(req, res, next) {
    try {

        const {pageId} = req.query

        if (!pageId) return next("Please provide page id")


        let likes = await getPageLikeQuery({
            pageId: new ObjectId(pageId)
        })

        res.status(200).json({likes: likes})

    } catch (ex) {
        next(ex)
    }
}




