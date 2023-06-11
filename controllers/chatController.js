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



export async function getGroups(req, res, next) {
    try {
        const {limit, pageSize} = req.query 

        const loggedUserId = new ObjectId(req.user._id)

        let limitInt = Number(limit ? limit : 10) 
        if (isNaN(limitInt)) {
            limitInt = 10
        }
    
        let messages = await Message.aggregate([  
        {
            $lookup: {
              from: "users", // Replace "users" with the actual name of the collection storing user information
              let: {
                recipientId: "$recipientId",
                senderId: "$senderId"
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $cond: {
                        if: { $eq: ["$recipientId", loggedUserId] },
                        then: { $eq: ["$_id", "$$senderId"] },
                        else: { $eq: ["$_id", "$$recipientId"] }
                      }
                    }
                  }
                },
                {
                  $project: { _id: 1, senderId: 1, fullName: 1, avatar: 1 } // Include the fields you want to retrieve from the "users" collection
                }
              ],
              as: "user"
            }
          },
          {
            $group: {
                _id: { "channelName": "$channelName" },
                    'messages': { '$addToSet': '$$ROOT' }
            }  
        },
        {
            '$project': {
                  _id: 0,
                channelName: "$_id.channelName",
                'messages': { '$slice': ['$messages', 1] } 
            }
        },
        {
            $limit: Number(limit)
        }
    ])

        // console.log(JSON.stringify(messages, undefined, 2))

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