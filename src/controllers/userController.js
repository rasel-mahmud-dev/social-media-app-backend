import {ObjectId} from "mongodb";
import User from "../models/User";
import Friend from "../models/Friend";
import {getFeedQuery} from "./feedController";
import Media from "../models/Media";

function getFriend(match) {
    return Friend.aggregate([
        match,
        {
            $lookup: {
                from: "users",
                localField: "senderId",
                foreignField: "_id",
                as: "sender"
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "receiverId",
                foreignField: "_id",
                as: "receiver"
            }
        },
        {
            $unwind: {path: "$sender"}
        }, {
            $unwind: {path: "$receiver"}
        },
        {
            $project: {
                sender: {
                    _id: 0,
                    password: 0,
                    role: 0,
                    friends: 0,
                    createdAt: 0,
                    updatedAt: 0,
                    email: 0,
                },
                receiver: {
                    _id: 0,
                    password: 0,
                    role: 0,
                    friends: 0,
                    createdAt: 0,
                    updatedAt: 0,
                    email: 0,
                }
            }
        }
    ])
}

// get all peoples without friends
export const getUsers = async (req, res, next) => {
    try {
        let friends = await Friend.find({
            status: "accepted",
            $or: [
                {receiverId: new ObjectId(req.user._id)},
                {senderId: new ObjectId(req.user._id)}
            ]
        }, {projection: {senderId: 1, receiverId: 1}})

        let inFriendList = []
        if (friends && Array.isArray(friends)) {
            inFriendList = friends.map(f => f.senderId)
            inFriendList = [...inFriendList, ...friends.map(f => f.receiverId)]
        }


        let users = await User.aggregate([
            {
                $match: {
                    _id: {
                        $nin: [new ObjectId(req.user._id), ...inFriendList]
                    }
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "author"
                }
            },
            {
                $project: {
                    password: 0,
                    role: 0,
                    createdAt: 0,
                    updatedAt: 0,
                    email: 0,
                }
            }
        ])
        res.status(200).json(users);
    } catch (ex) {
        next(ex);
    }
}


export const getFriends = async (req, res, next) => {
    try {

        // get all friend request
        let allFriends = await getFriend({
            $match: {
                $or: [
                    {receiverId: new ObjectId(req.user._id)},
                    {senderId: new ObjectId(req.user._id)}
                ]
            }
        })

        let pendingFriends = allFriends.filter(friend => friend.status === "pending")
        let friends = allFriends.filter(friend => friend.status === "accepted")

        res.status(200).json({friends: friends, pendingFriends});

    } catch (ex) {
        next(ex);
    }
}


export const addFriend = async (req, res, next) => {

    try {
        const {friendId} = req.body
        let payload = {
            receiverId: new ObjectId(friendId),
            senderId: new ObjectId(req.user._id),
            status: "pending",
            createdAt: new Date()
        }
        await Friend.updateOne({
            receiverId: new ObjectId(friendId),
            senderId: new ObjectId(req.user._id),
        }, {
            $set: payload
        }, {
            upsert: true
        })
        let friend = await getFriend({
            $match: {
                receiverId: new ObjectId(friendId),
                senderId: new ObjectId(req.user._id),
            }
        })
        res.status(201).json({message: "Friend request has send", friend: friend[0]})

    } catch (error) {
        next(error);
    }
}


export const removeFriend = async (req, res, next) => {
    try {
        const {friendId} = req.body
        await Friend.deleteOne({
            _id: new ObjectId(friendId),
            $or: [
                {receiverId: new ObjectId(req.user._id)},
                {senderId: new ObjectId(req.user._id)}
            ]
        })

        res.status(201).json({
            message: "Friend has been removed"
        })

    } catch (error) {
        next(error);

    }
}


export const acceptFriendRequest = async (req, res, next) => {

    try {
        const {friendId} = req.body

        let result = await Friend.updateOne({
            _id: new ObjectId(friendId),
            receiverId: new ObjectId(req.user._id),
        }, {
            $set: {
                status: "accepted"
            }
        })

        let friend = await getFriend({
            $match: {
                _id: new ObjectId(friendId),
                receiverId: new ObjectId(req.user._id),
                status: "accepted"
            }
        })
        return res.status(201).json({message: "Request Accepted", friend: friend[0]})


    } catch (error) {
        console.log(error)
        next(error);
    }
}


export const rejectFriendRequest = async (req, res, next) => {
    try {
        const {friendId} = req.body

        let result = await Friend.deleteOne({
            receiverId: new ObjectId(req.user._id),
            senderId: new ObjectId(friendId)
        })
        if (result.modifiedCount) {
            res.status(201).json({message: "Request Accepted"})
        } else {
            next("Request not accepted");
        }
    } catch (error) {
        next(error);
    }
}


// get all peoples without friends
export const getProfile = async (req, res, next) => {
    const {userId} = req.params
    try {
        let allFriends = await getFriend({
            $match: {
                status: "accepted",
                $or: [
                    {receiverId: new ObjectId(userId)},
                    {senderId: new ObjectId(userId)}
                ]
            }
        })

        let feeds = await getFeedQuery({

            userId: new ObjectId(userId)

        })

        let user = await User.findOne({
            _id: new ObjectId(userId)
        }, {
            projection: {
                password: 0,
                email: 0
            }
        })

        res.status(200).json({friends: allFriends, feeds: feeds, user});


    } catch (ex) {
        next(ex);
    }
}


// get all peoples without friends
export const getMedia = async (req, res, next) => {
    const {userId} = req.params
    try {
        let allMedia = await Media.find({
            userId: new ObjectId(userId)
        })

        res.status(200).json({media: allMedia});


    } catch (ex) {
        next(ex);
    }
}
