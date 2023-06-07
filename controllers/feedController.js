import {ObjectId} from "mongodb";
import imageUpload from "../services/imageUpload";
import Feed from './../models/Feed';
import {cpSync} from "fs"
import Like from "../models/Like";

const formidable = require("formidable");


// get all feeds
export const getFeeds = async (req, res, next) => {
    try {
        let feeds = await Feed.aggregate([
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
        res.status(200).json(feeds);
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
                    console.log(image.filepath);
                    let newPath = image.filepath.replace(image.newFilename, image.originalFilename)
                    cpSync(files.avatar.filepath, newPath)
                    console.log(newPath);
                    fileUploadPromises.push(imageUpload(newPath, "social-app"))
                })

                let result = await Promise.allSettled(fileUploadPromises)

                result.forEach(item => {
                    if (item.status === "fulfilled" && item.value) {
                        images.push(item.value.secure_url)
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
                res.status(201).json({feed});
            } else {
                next("Feed post fail");
            }

        } catch (ex) {
            next(ex);
        }
    });
};


// toggle like
export const toggleLike = async (req, res, next) => {
    try {
        const {feedId} = req.body

        let exists = await Like.findOne({
            feedId: new ObjectId(feedId),
            userId: new ObjectId(req.user._id)
        })

        if (exists) {
            await Like.deleteOne({
                feedId: new ObjectId(feedId),
                userId: new ObjectId(req.user._id)
            })
            res.status(201).json({isAdded: false});
        } else {
            let newLike = await new Like({
                feedId: new ObjectId(feedId),
                reaction: "like", // love, haha, sad
                userId: new ObjectId(req.user._id)
            })
            newLike = await newLike.save()
            res.status(201).json({isAdded: true, newLike});
        }

    } catch (ex) {
        next(ex);
    }
};
