import {ObjectId} from "mongodb";
import Feed from './../models/Feed';
import Like from "../models/Like";
import pusher from "../pusher/pusher";
import Comment from "../models/Comment";
import imageKitUpload from "../services/ImageKitUpload";

const formidable = require("formidable");


export function getFeedQuery(match) {
    return Feed.aggregate([
        match ? match : {$match: {}},
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
        let feeds = await getFeedQuery(null)
        res.status(200).json(feeds);
    } catch (ex) {
        next(ex);
    }
}

// get feed
export const getFeed = async (req, res, next) => {
    try {
        let feeds = await getFeedQuery({
            $match: {
                _id: new ObjectId(req.params.feedId)
            }
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
                userTags
            } = fields;


            let images = []

            if (files && files.image && Array.isArray(files.image)) {

                let fileUploadPromises = []

                files.image.forEach(image => {
                    let name = image.newFilename + "-" + image.originalFilename
                    fileUploadPromises.push(imageKitUpload(image.filepath, name, "social-app"))
                })

                let result = await Promise.allSettled(fileUploadPromises)

                result.forEach(item => {
                    if (item.status === "fulfilled" && item.value) {
                        images.push(item.value.url)
                    }
                })
            }

            let feed = new Feed({
                content,
                userId: new ObjectId(req.user._id),
                images,
                userTags
            })

            feed = await feed.save()
            if (feed) {
                feed = await getFeedQuery({
                    $match: {_id: new ObjectId(feed._id)}
                })

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
