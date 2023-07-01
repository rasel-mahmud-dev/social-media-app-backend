import {ObjectId} from "mongodb";

import * as yup from "yup"
import formidable from "formidable";
import Group from "src/models/Group";
import imageKitUpload from "src/services/ImageKitUpload";
import Page from "src/models/Page";
import Feed from "src/models/Feed";
import PageLike from "src/models/PageLike";
import PageFollower from "src/models/PageFollower";


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
                pageId: 1,
                _id: 1
            }
        }
    ])
}

function getPageFollowerQuery(match = {}) {
    return PageFollower.aggregate([
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
                pageId: 1,
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
        const pages = await Page.aggregate([
            {
                $match: {
                    ownerId: {
                        $nin: [new ObjectId(req.user._id)]
                    }
                }
            },
            {
                $lookup: {
                    from: "page_like",
                    let: {pageId: "$_id"},
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        {$eq: ["$pageId", "$$pageId"]},
                                        {$eq: ["$userId", new ObjectId(req.user._id)]}
                                    ]
                                }
                            }
                        }
                    ],
                    as: "likedPages"
                }
            },
            // Filter pages where the likedPages array is empty (user has not liked the page)
            {
                $match: {
                    likedPages: {$eq: []}
                }
            },
            {
                $lookup: {
                    from: "page_follower",
                    let: {pageId: "$_id"},
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        {$eq: ["$pageId", "$$pageId"]},
                                        {$eq: ["$userId", new ObjectId(req.user._id)]}
                                    ]
                                }
                            }
                        }
                    ],
                    as: "pageFollower"
                }
            },
            // Filter pages where the likedPages array is empty (user has not liked the page)
            {
                $match: {
                    pageFollower: {$eq: []}
                }
            },

            {
                $project: {
                    likedPages: 0,
                    pageFollower: 0
                }
            }
        ])


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
                category,
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
        if (!pageName) return next("Please provide page name")
        let pages = await Page.aggregate([
            {
                $match: {
                    name: pageName
                }
            }
        ])

        if (pages.length > 0) {

            let totalLikes = await PageLike.countDocuments({pageId: pages[0]._id}) || 0
            let totalFollowers = await PageFollower.countDocuments({pageId: pages[0]._id}) || 0

            res.status(200).json({
                page: pages[0],
                totalLikes,
                totalFollowers
            })
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

// add page like
export async function addPageLike(req, res, next) {
    try {

        const {pageId} = req.body

        if (!pageId) return next("Please provide page id")

        const page = await Page.findOne({_id: new ObjectId(pageId)})
        if (!page) return next("This Page is not found")

        await PageLike.updateOne({
            pageId: new ObjectId(pageId),
            userId: new ObjectId(req.user._id),
        }, {
            $set: {
                pageId: new ObjectId(pageId),
                userId: new ObjectId(req.user._id),
                createdAt: new Date()
            }
        }, {upsert: true})


        let likes = await getPageLikeQuery({
            pageId: new ObjectId(pageId)
        })

        res.status(201).json({
            like: likes[0]
        })


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


// get page likes
export async function getPageLikesAndFollowing(req, res, next) {
    try {
        let following = await PageLike.aggregate([
            {$match: {}},
            {
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


        res.status(200).json({following: following})

    } catch (ex) {
        next(ex)
    }
}


// get page likes
export async function getPageFollowing(req, res, next) {
    try {
        const {pageId} = req.params

        if (!pageId) return next("Please provide page id")

        let following = await PageFollower.aggregate([
            {
                $match: {
                    pageId: new ObjectId(pageId)
                }
            },
            {
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


        res.status(200).json({following: following})

    } catch (ex) {
        next(ex)
    }
}


export async function togglePageFollow(req, res, next) {
    try {

        const {pageId, withLike = false} = req.body

        if (!pageId) return next("Please provide page id")

        const page = await Page.findOne({_id: new ObjectId(pageId)})
        if (!page) return next("This Page is not found")

        let result = await PageFollower.deleteOne({
            pageId: new ObjectId(pageId),
            userId: new ObjectId(req.user._id)
        })

        if (result.deletedCount) {
            // also remove like if pass withLike true from frontend
            if (withLike) {
                await PageLike.deleteOne({
                    pageId: new ObjectId(pageId),
                    userId: new ObjectId(req.user._id)
                })
            }
            res.status(201).json({removed: true})
        } else {
            let result = await PageFollower.insertOne({
                pageId: new ObjectId(pageId),
                userId: new ObjectId(req.user._id),
                createdAt: new Date()
            })
            // also add like if pass withLike true from frontend
            if (withLike) {
                await PageLike.insertOne({
                    pageId: new ObjectId(pageId),
                    userId: new ObjectId(req.user._id)
                })
            }
            if (result.insertedId) {
                let followers = await getPageFollowerQuery({
                    _id: new ObjectId(result.insertedId)
                })
                res.status(201).json({
                    removed: false, follower: followers[0]
                })
            } else {
                res.status(201).json({removed: true})
            }
        }
    } catch (ex) {
        next(ex)
    }
}


const page = {
    "_id": "649e7e41d11c9729ed1a6376",
    "ownerId": "649183422a6cba0233eb9d4a",
    "bio": "",
    "coverPhoto": "",
    "createdAt": "2023-06-30T07:03:29.833Z",
    "name": "Rakib page",
    "slug": "Rakib page"
}


const pageLikes = {
    "_id": "649e7e41d11c9729ed1a6376",
    "userId": "649e7e41d11c9723423423",
    "pageId": "649e7e41d11c9729ed1a6376",
    "createdAt": "2023-06-30T07:03:29.833Z"
}
