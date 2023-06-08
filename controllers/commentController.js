import {ObjectId} from "mongodb";
import Feed from './../models/Feed';
import pusher from "../pusher/pusher";

function getCommentQuery(match) {
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
export const getComments = async (req, res, next) => {
    try {
        let comments = await getCommentQuery({
            $match: {
                feedId: new ObjectId(req.param.feedId)
            }
        })
        res.status(200).json({comments});
    } catch (ex) {
        next(ex);
    }
}


// create feed
export const createComment = async (req, res, next) => {
    // parse a file upload

    try {
        const {comment, feedId} = req.body

        let newComment = new Comment({
            comment,
            feedId: new ObjectId(feedId),
            userId: new ObjectId(req.user._id)
        })

        newComment = await newComment.save()

        if (newComment) {

            let comment = await getComments({
                $match: {_id: new ObjectId(newComment._id)}
            })

            pusher.trigger("public-channel", "new-comment", {
                comment: comment[0]
            }).catch(ex => {
                //handle error
            })

            res.status(201).json({comment});

        } else {
            next("Comment post fail");
        }
    } catch (ex) {
        next("Comment post fail");
    }
};


// get all feed comments
export const deleteComment = async (req, res, next) => {
    try {
        let result = await Comment.deleteOne({_id: new ObjectId(req.param.feedId)})
        res.status(201).json({message: "comment has been deleted"});
    } catch (ex) {
        next(ex);
    }
}
