import {ObjectId} from "mongodb";
import Saved from "../models/Saved";

function getSavedQuery(match) {
    return Saved.aggregate([
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
                from: "feed",
                localField: "feedId",
                foreignField: "_id",
                as: "feed"
            }
        },
        {
            $unwind: {path: "$feed"}
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
                }
            }
        }
    ])
}

// get all feed comments
export const getSaved = async (req, res, next) => {
    try {
        let saved = await getSavedQuery({
            $match: {
                userId: new ObjectId(req.user._id)
            }
        })
        res.status(200).json({saved});
    } catch (ex) {
        next(ex);
    }
}


// create feed
export const createSaved = async (req, res, next) => {
    // parse a file upload

    try {
        const {feedId} = req.body

        let payload = {
            feedId: new ObjectId(feedId),
            userId: new ObjectId(req.user._id)
        }

        await  Saved.updateOne(payload, {
            $set: {
                ...payload,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        }, {upset: true})

        let newPopulatedComment = await getSavedQuery({
            $match: payload
        })

        res.status(201).json({saved: newPopulatedComment[0]});

    } catch (ex) {
        next("Saved fail");
    }
};
