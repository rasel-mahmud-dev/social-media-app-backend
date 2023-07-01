import {ObjectId} from "mongodb";
import Feed from '../models/Feed';
import Like from "../models/Like";
import pusher from "../pusher/pusher";
import Comment from "../models/Comment";
import imageKitUpload from "../services/ImageKitUpload";
import Media from "../models/Media";
import Group from "src/models/Group";
import Page from "src/models/Page";

const formidable = require("formidable");


export function getFeedQuery(query = {}) {
    return Feed.aggregate([
        {$match: query},
        {
            $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "author"
            }
        },
        {
            $unwind: {path: "$author"}
        },
        {
            $lookup: {
                from: "like",
                localField: "_id",
                foreignField: "feedId",
                as: "likes"
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                author: {
                    password: 0,
                    role: 0,
                    createdAt: 0,
                    updatedAt: 0,
                    email: 0,
                },
                likes: {
                    "feedId": 0,
                    "createdAt": 0,
                    "updatedAt": 0
                }
            }
        }
    ])
}


// get all feeds
export const getFeeds = async (req, res, next) => {
    try {
        let {userId, pageNumber = "1"} = req.query

        const limit = 10;

        pageNumber = Number(pageNumber)
        if (isNaN(pageNumber)) {
            pageNumber = 1
        }

        let feeds = []
        if (userId) {
            feeds = await getFeedQuery({
                userId: new ObjectId(userId)
            })
        } else {
            feeds = await Feed.aggregate([
                {
                    $match: {
                        $or: [
                            {type: "user"},
                            {type: "page"}
                        ]
                    }
                },
                {
                    $lookup: {
                        from: "friend",
                        let: {userId: new ObjectId(req.user._id)}, // feed collection ar localfield
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            {
                                                $or: [
                                                    {$eq: ["$senderId", "$$userId"]},
                                                    {$eq: ["$receiverId", "$$userId"]}
                                                ],
                                            },
                                            {$eq: ["$status", "accepted"]}
                                        ]

                                    }
                                }
                            }
                        ],
                        as: "friend"
                    }
                },
                {
                    $lookup: {
                        from: "follow",
                        let: {userId: "$userId"}, // feed collection ar localfield
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $or: [
                                            {$eq: ["$following", "$$userId"]},
                                            {$eq: ["$follower", "$$userId"]}
                                        ]
                                    }
                                }
                            }
                        ],
                        as: "followedUser"
                    }
                },
                {
                    $lookup: {
                        from: "page_like",
                        localField: "pageId",
                        foreignField: "pageId",
                        as: "likedPages"
                    }
                },
                {
                    $lookup: {
                        from: "media",
                        localField: "videoId",
                        foreignField: "_id",
                        as: "video"
                    }
                },
                {
                    $unwind: {path: "$video", preserveNullAndEmptyArrays: true}
                },
                // {
                //     $match: {
                //         $expr: {
                //             $cond: {
                //                 if: {$ne: [{$size: "$likedPages"}, 0]},
                //                 then: {
                //                     $in: [new ObjectId(req.user._id), "$likedPages.userId"]
                //                 },
                //                 else: false
                //             }
                //         },
                //     }
                // },
                // {
                //     $match: {
                //         "likedPages.userId": {
                //             $in: [new ObjectId(req.user._id)]
                //         }
                //     }
                // },
                {
                    $match: {
                        $or: [
                            {"userId": userId},
                            {"friend.senderId": {$exists: true}},
                            {"friend.receiverId": {$exists: true}},
                            {"followedUser.follower": {$exists: true}},
                            {"followedUser.following": {$exists: true}},
                        ]
                    }
                },
                // {
                //     $match: {
                //         $expr: {
                //
                //                 if: {$ne: [{$size: "$likedPages"}, 0]},
                //                 then: {
                //                     $in: [new ObjectId(req.user._id), "$likedPages.userId"]
                //                 },
                //                 else: {
                //                     type: "page"
                //                 }
                //
                //         },
                //     }
                // },
                {
                    $lookup: {
                        from: "users",
                        localField: "userId",
                        foreignField: "_id",
                        as: "author"
                    }
                },
                {
                    $unwind: {path: "$author"}
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
                    $unwind: {path: "$page", preserveNullAndEmptyArrays: true}
                },
                {
                    $lookup: {
                        from: "like",
                        localField: "_id",
                        foreignField: "feedId",
                        as: "likes"
                    }
                },
                {
                    $lookup: {
                        from: "comment",
                        localField: "_id",
                        foreignField: "feedId",
                        as: "comments"
                    }
                },
                {
                    $addFields: {
                        totalComment: {
                            $size: "$comments"
                        }
                    },
                },
                {
                    $addFields: {
                        totalLikes: {
                            $size: "$likes"
                        }
                    },
                },
                // {
                //     $unwind: {path: "$comments", preserveNullAndEmptyArrays: true} // Unwind the "comments" array
                // },
                // {
                //     $lookup: {
                //         from: "users",
                //         localField: "comments.userId",
                //         foreignField: "_id",
                //         as: "comments.author"
                //     }
                // },
                // {
                //     $unwind: {path: "$comments.author", preserveNullAndEmptyArrays: true}
                // },
                {
                    $sort: {
                        createdAt: -1
                    }
                },
                {
                    $skip: limit * (pageNumber - 1)
                },
                {
                    $limit: limit
                },
                // {
                //     $group: {
                //         _id: null,
                //         comment: { $first: "$comments" } // Get the first comment
                //     }
                // },
                {
                    $project: {
                        author: {
                            password: 0,
                            role: 0,
                            createdAt: 0,
                            updatedAt: 0,
                            email: 0,
                        },
                        likes: 0,
                        comments: 0
                        // comment: { $slice: ["$comments", 1] }
                    }
                }
            ])
        }
        res.status(200).json(feeds);
    } catch (ex) {
        next(ex);
    }
}


// get my groups feeds
export const getMyGroupsFeeds = async (req, res, next) => {
    try {
        let {userId, pageNumber = "1"} = req.query

        const limit = 10;

        pageNumber = Number(pageNumber)
        if (isNaN(pageNumber)) {
            pageNumber = 1
        }

        let feeds = await Feed.aggregate([
            {
                $match: {
                    $or: [
                        {type: "group"}
                    ]
                }
            },
            // {
            //     $lookup: {
            //         from: "friend",
            //         let: {userId: new ObjectId(req.user._id)}, // feed collection ar localfield
            //         pipeline: [
            //             {
            //                 $match: {
            //                     $expr: {
            //                         $and: [
            //                             {
            //                                 $or: [
            //                                     {$eq: ["$senderId", "$$userId"]},
            //                                     {$eq: ["$receiverId", "$$userId"]}
            //                                 ],
            //                             },
            //                             {$eq: ["$status", "accepted"]}
            //                         ]
            //
            //                     }
            //                 }
            //             }
            //         ],
            //         as: "friend"
            //     }
            // },
            // {
            //     $lookup: {
            //         from: "follow",
            //         let: {userId: "$userId"}, // feed collection ar localfield
            //         pipeline: [
            //             {
            //                 $match: {
            //                     $expr: {
            //                         $or: [
            //                             {$eq: ["$following", "$$userId"]},
            //                             {$eq: ["$follower", "$$userId"]}
            //                         ]
            //                     }
            //                 }
            //             }
            //         ],
            //         as: "followedUser"
            //     }
            // },
            {
                $lookup: {
                    from: "page_like",
                    localField: "pageId",
                    foreignField: "pageId",
                    as: "likedPages"
                }
            },
            {
                $lookup: {
                    from: "groups",
                    localField: "groupId",
                    foreignField: "_id",
                    as: "group"
                }
            },
            {
                $unwind: {path: "$group", preserveNullAndEmptyArrays: false}
            },
            {
                $lookup: {
                    from: "media",
                    localField: "videoId",
                    foreignField: "_id",
                    as: "video"
                }
            },
            {
                $unwind: {path: "$video", preserveNullAndEmptyArrays: true}
            },
            // {
            //     $match: {
            //         $or: [
            //             {"userId": userId},
            //             {"friend.senderId": {$exists: true}},
            //             {"friend.receiverId": {$exists: true}},
            //             {"followedUser.follower": {$exists: true}},
            //             {"followedUser.following": {$exists: true}},
            //         ]
            //     }
            // },
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "author"
                }
            },
            {
                $unwind: {path: "$author"}
            },
            {
                $lookup: {
                    from: "like",
                    localField: "_id",
                    foreignField: "feedId",
                    as: "likes"
                }
            },
            {
                $lookup: {
                    from: "comment",
                    localField: "_id",
                    foreignField: "feedId",
                    as: "comments"
                }
            },
            {
                $addFields: {
                    totalComment: {
                        $size: "$comments"
                    }
                },
            },
            {
                $addFields: {
                    totalLikes: {
                        $size: "$likes"
                    }
                },
            },
            {
                $sort: {
                    createdAt: -1
                }
            },
            {
                $skip: limit * (pageNumber - 1)
            },
            {
                $limit: limit
            },
            // {
            //     $group: {
            //         _id: null,
            //         comment: { $first: "$comments" } // Get the first comment
            //     }
            // },
            {
                $project: {
                    author: {
                        password: 0,
                        role: 0,
                        createdAt: 0,
                        updatedAt: 0,
                        email: 0,
                    },
                    likes: 0,
                    comments: 0
                    // comment: { $slice: ["$comments", 1] }
                }
            }
        ])

        res.status(200).json(feeds);
    } catch (ex) {
        next(ex);
    }
}


// get all feeds
export const getVideoFeeds = async (req, res, next) => {
    try {
        let {userId, pageNumber = "1"} = req.query

        const limit = 10;

        pageNumber = Number(pageNumber)
        if (isNaN(pageNumber)) {
            pageNumber = 1
        }

        let feeds = []
        if (userId) {
            feeds = await getFeedQuery({
                userId: new ObjectId(userId)
            })
        } else {
            feeds = await Feed.aggregate([
                {
                    $match: {
                        $or: [
                            {type: "user"},
                            {type: "page"}
                        ]
                    }
                },
                {
                    $lookup: {
                        from: "friend",
                        let: {userId: new ObjectId(req.user._id)}, // feed collection ar localfield
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            {
                                                $or: [
                                                    {$eq: ["$senderId", "$$userId"]},
                                                    {$eq: ["$receiverId", "$$userId"]}
                                                ],
                                            },
                                            {$eq: ["$status", "accepted"]}
                                        ]

                                    }
                                }
                            }
                        ],
                        as: "friend"
                    }
                },
                {
                    $lookup: {
                        from: "follow",
                        let: {userId: "$userId"}, // feed collection ar localfield
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $or: [
                                            {$eq: ["$following", "$$userId"]},
                                            {$eq: ["$follower", "$$userId"]}
                                        ]
                                    }
                                }
                            }
                        ],
                        as: "followedUser"
                    }
                },
                {
                    $lookup: {
                        from: "page_like",
                        localField: "pageId",
                        foreignField: "pageId",
                        as: "likedPages"
                    }
                },
                {
                    $lookup: {
                        from: "media",
                        localField: "videoId",
                        foreignField: "_id",
                        as: "video"
                    }
                },
                {
                    $unwind: {path: "$video"}
                },
                // {
                //     $match: {
                //         $expr: {
                //             $cond: {
                //                 if: {$ne: [{$size: "$likedPages"}, 0]},
                //                 then: {
                //                     $in: [new ObjectId(req.user._id), "$likedPages.userId"]
                //                 },
                //                 else: false
                //             }
                //         },
                //     }
                // },
                // {
                //     $match: {
                //         "likedPages.userId": {
                //             $in: [new ObjectId(req.user._id)]
                //         }
                //     }
                // },
                {
                    $match: {
                        $or: [
                            {"userId": userId},
                            {"friend.senderId": {$exists: true}},
                            {"friend.receiverId": {$exists: true}},
                            {"followedUser.follower": {$exists: true}},
                            {"followedUser.following": {$exists: true}},
                        ]
                    }
                },
                // {
                //     $match: {
                //         $expr: {
                //
                //                 if: {$ne: [{$size: "$likedPages"}, 0]},
                //                 then: {
                //                     $in: [new ObjectId(req.user._id), "$likedPages.userId"]
                //                 },
                //                 else: {
                //                     type: "page"
                //                 }
                //
                //         },
                //     }
                // },
                {
                    $lookup: {
                        from: "users",
                        localField: "userId",
                        foreignField: "_id",
                        as: "author"
                    }
                },
                {
                    $unwind: {path: "$author"}
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
                    $unwind: {path: "$page", preserveNullAndEmptyArrays: true}
                },
                {
                    $lookup: {
                        from: "like",
                        localField: "_id",
                        foreignField: "feedId",
                        as: "likes"
                    }
                },
                {
                    $lookup: {
                        from: "comment",
                        localField: "_id",
                        foreignField: "feedId",
                        as: "comments"
                    }
                },
                {
                    $addFields: {
                        totalComment: {
                            $size: "$comments"
                        }
                    },
                },
                {
                    $addFields: {
                        totalLikes: {
                            $size: "$likes"
                        }
                    },
                },
                // {
                //     $unwind: {path: "$comments", preserveNullAndEmptyArrays: true} // Unwind the "comments" array
                // },
                // {
                //     $lookup: {
                //         from: "users",
                //         localField: "comments.userId",
                //         foreignField: "_id",
                //         as: "comments.author"
                //     }
                // },
                // {
                //     $unwind: {path: "$comments.author", preserveNullAndEmptyArrays: true}
                // },
                {
                    $sort: {
                        createdAt: -1
                    }
                },
                {
                    $skip: limit * (pageNumber - 1)
                },
                {
                    $limit: limit
                },
                // {
                //     $group: {
                //         _id: null,
                //         comment: { $first: "$comments" } // Get the first comment
                //     }
                // },
                {
                    $project: {
                        author: {
                            password: 0,
                            role: 0,
                            createdAt: 0,
                            updatedAt: 0,
                            email: 0,
                        },
                        likes: 0,
                        comments: 0
                        // comment: { $slice: ["$comments", 1] }
                    }
                }
            ])
        }
        res.status(200).json(feeds);
    } catch (ex) {
        next(ex);
    }
}


// get feed
export const getFeed = async (req, res, next) => {
    try {
        let feeds = await getFeedQuery({
            _id: new ObjectId(req.params.feedId)
        })
        res.status(200).json({feed: feeds[0]});
    } catch (ex) {
        next(ex);
    }
}


// create feed
export const createFeed = (req, res, next) => {
    // parse a file upload
    const form = formidable({multiples: true});

    form.parse(req, async (err, fields, files) => {
        if (err) return next("Can't read form data");
        try {

            const {
                content,
                userTags,
                groupSlug = "",
                pageName = "",
            } = fields;


            let images = []

            let incomingFiles = []

            let group;
            let page;
            if (groupSlug) {
                group = await Group.findOne({slug: groupSlug})
                if (!group) return next("This Group is not found")
            } else if (pageName) {
                page = await Page.findOne({name: pageName})
                if (!page) return next("This Page is not found")
            }


            if (files && files.image && Array.isArray(files.image)) {
                incomingFiles = files.image

            } else if (typeof files.image === "object") {
                incomingFiles = [files.image]
            }

            let fileUploadPromises = []
            let uploadFail = incomingFiles.length !== 0

            if (incomingFiles && Array.isArray(incomingFiles)) {
                incomingFiles.forEach(image => {
                    let name = image.newFilename + "-" + image.originalFilename
                    fileUploadPromises.push(imageKitUpload(image.filepath, name, "social-app"))
                })

                let result = await Promise.allSettled(fileUploadPromises)

                result.forEach(item => {
                    if (item.status === "fulfilled" && item.value) {
                        uploadFail = false
                        images.push(item.value.url)
                    }
                })
            }

            if (uploadFail) return next("Post image upload fail.")

            let feed = new Feed({
                content,
                groupId: group ? new ObjectId(group._id) : new ObjectId("000000000000000000000000"),
                pageId: page ? new ObjectId(page._id) : new ObjectId("000000000000000000000000"),
                type: group ? "group" : page ? "page" : "user",
                userId: new ObjectId(req.user._id),
                images,
                userTags
            })

            feed = await feed.save()
            if (feed) {
                let newFeedId = feed._id
                feed = await getFeedQuery({
                    _id: new ObjectId(feed._id)
                })

                if (images.length > 0) {
                    let allMedia = images.map(img => (
                        {
                            feedId: newFeedId,
                            userId: new ObjectId(req.user._id),
                            type: "image",
                            url: img
                        }
                    ))

                    Media.insertMany(allMedia).catch(ex => {
                        console.log("media save fail")
                    })

                }


                pusher.trigger("public-channel", "new-feed", {
                    feed: feed[0]
                }).then(() => {

                }).catch(ex => {
                    console.log(ex.message)
                })


                res.status(201).json({feed: feed[0]});

            } else {
                next("Feed post fail");
            }

        } catch (ex) {
            next(ex);
        }
    });
};


// create feed
export const deleteFeed = async (req, res, next) => {
    try {
        let result = await Feed.deleteOne({
            userId: new ObjectId(req.user._id),
            _id: new ObjectId(req.params.feedId)
        })
        // also remove all comment associate this feed
        await Comment.deleteMany({
            userId: new ObjectId(req.user._id),
            feedId: new ObjectId(req.params.feedId)
        })

        pusher.trigger("public-channel", "remove-feed", {
            feed: {
                userId: req.user._id,
                _id: req.params.feedId
            }
        }).catch(ex => {
            //handle error
        })

        res.status(201).json({message: "Feed has been deleted"});
    } catch (ex) {
        next(ex);
    }
};


// toggle like
export const toggleLike = async (req, res, next) => {
    try {
        const {feedId} = req.body

        let exists = await Like.findOne({
            feedId: new ObjectId(feedId),
            userId: new ObjectId(req.user._id)
        })

        let response = {}

        if (exists) {
            await Like.deleteOne({
                feedId: new ObjectId(feedId),
                userId: new ObjectId(req.user._id)
            })

            response = {
                isAdded: false,
                like: {
                    _id: exists._id,
                    feedId: feedId,
                    userId: req.user._id
                }
            }

        } else {
            let newLike = await new Like({
                feedId: new ObjectId(feedId),
                reaction: "like", // love, haha, sad
                userId: new ObjectId(req.user._id)
            })
            newLike = await newLike.save()
            response = {
                isAdded: true,
                like: newLike
            }
        }

        await pusher.trigger("public-channel", "toggle-reaction", response).catch(ex => {
            console.log(ex.message)
        })

        res.status(201).json(response);

    } catch (ex) {
        next(ex);
    }
};

