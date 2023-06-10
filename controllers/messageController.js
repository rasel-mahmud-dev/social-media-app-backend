import Message from "../models/Message";
import {ObjectId} from "mongodb";
import pusher from "../pusher/pusher";


function getMessageQuery(match) {
    return Message.aggregate([
        match ? match : {$match: {}},
        {
            $lookup: {
                from: "users",
                localField: "senderId",
                foreignField: "_id",
                as: "sender"
            }
        },
        {
            $unwind: {path: "$sender"}
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                sender: {
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

export async function getMessages(req, res, next) {
    try {
        let messages = await Message.find({
            $or: [
                {senderId: new ObjectId(req.user._id)},
                {recipientId: new ObjectId(req.user._id)}
            ]
        })
        res.status(200).json({messages: messages})

    } catch (ex) {
        next(ex)
    }
}


export async function getChannelMessages(req, res, next) {
    if (!req.params.channelName) return next("Please provide channel name")
    try {
        let messages = await Message.find({
            channelName: req.params.channelName,
            $or: [
                {senderId: new ObjectId(req.user._id)},
                {recipientId: new ObjectId(req.user._id)}
            ]
        })
        res.status(200).json({messages: messages})

    } catch (ex) {
        next(ex)
    }
}

export async function sendMessage(req, res, next) {
    const {message, channelName, recipientId} = req.body

    try {

        let newMessage = new Message({
            message,
            channelName: channelName,
            recipientId: new ObjectId(recipientId),
            senderId: new ObjectId(req.user._id)
        })


        newMessage = await newMessage.save()

        let messages = await getMessageQuery({
            $match: {
                _id: new ObjectId(newMessage._id)
            }
        })


        // broadcast to friend
        // Trigger a 'message' event on the recipient's private channel
        pusher.trigger(`private-chat-${recipientId}`, 'message', {
            message: messages[0]
        }).then(a => {
        }).catch(ex => {
            console.log(ex)
        })

        res.status(201).json({message: newMessage})

    } catch (ex) {
        next(ex)
    }
}