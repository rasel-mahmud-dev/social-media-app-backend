import Message from "../models/Message";
import {ObjectId} from "mongodb";
import pusher from "../pusher/pusher";
import Room from "../models/Room";

import * as yup from "yup"
import formidable from "formidable";
import Group from "src/models/Group";
import imageKitUpload from "src/services/ImageKitUpload";


function getRoomQuery(match = {}) {
    return Room.aggregate([
        {$match: match},
        {
            $lookup: {
                from: "users",
                localField: "participants.userId",
                foreignField: "_id",
                as: "participants"
            }
        },
        {
            $project: {
                name: 1,
                type: 1,
                _id: 1,
                participants: {
                    _id: 1,
                    fullName: 1,
                    avatar: 1
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

// create chat room
export async function createGroup(req, res, next) {
    const form = formidable({multiple: false})
    form.parse(req, async function (err, fields, files) {
        try {
            const {name, description, isPublic = "1", _id = ""} = fields

            let schema = yup.object({
                name: yup.string().required().max(100),
                description: yup.string().max(800)
            })

            await schema.validate({
                name,
                description
            })

            let isExist = await Group.findOne({name})
            if (isExist) return next("This name is already used in someone group")

            let payload = {
                name,
                ownerId: new ObjectId(req.user._id),
                description,
                isPublic: isPublic === "1",
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

            // create a room if there are not exist this room
            let result = await Group.updateOne({
                ownerId: payload.ownerId,
                _id: _id ? new ObjectId(_id) : new ObjectId()
            }, {
                $set: {
                    ...payload,
                    createdAt: new Date()
                }
            }, {
                upsert: true
            })

            if (result.upsertedId || result.matchedCount) {
                res.status(201).json({message: "group has been created."})
            }

        } catch (ex) {
            next(ex)
        }
    })
}


export async function getRooms(req, res, next) {
    try {
        // const {limit, pageSize} = req.query
        //
        // const loggedUserId = new ObjectId(req.user._id)
        //
        // let limitInt = Number(limit ? limit : 10)
        // if (isNaN(limitInt)) {
        //     limitInt = 10
        // }

        let rooms = await getRoomQuery({
            type: "private",
            participants: {
                $elemMatch: {
                    userId: new ObjectId(req.user._id)
                }
            }
        })

        // console.log(rooms)

        res.status(200).json({rooms: rooms})


        //     let messages = await Message.aggregate([
        //     {
        //         $lookup: {
        //           from: "users", // Replace "users" with the actual name of the collection storing user information
        //           let: {
        //             recipientId: "$recipientId",
        //             senderId: "$senderId"
        //           },
        //           pipeline: [
        //             {
        //               $match: {
        //                 $expr: {
        //                   $cond: {
        //                     if: { $eq: ["$recipientId", loggedUserId] },
        //                     then: { $eq: ["$_id", "$$senderId"] },
        //                     else: { $eq: ["$_id", "$$recipientId"] }
        //                   }
        //                 }
        //               }
        //             },
        //             {
        //               $project: { _id: 1, senderId: 1, fullName: 1, avatar: 1 } // Include the fields you want to retrieve from the "users" collection
        //             }
        //           ],
        //           as: "user"
        //         }
        //       },
        //       {
        //         $room: {
        //             _id: { "channelName": "$channelName" },
        //                 'messages': { '$addToSet': '$$ROOT' }
        //         }
        //     },
        //     {
        //         '$project': {
        //               _id: 0,
        //             channelName: "$_id.channelName",
        //             'messages': { '$slice': ['$messages', 1] }
        //         }
        //     },
        //     {
        //         $limit: Number(limit)
        //     }
        // ])
        //
        //     // console.log(JSON.stringify(messages, undefined, 2))
        //
        //     res.status(200).json({messages: messages})

    } catch (ex) {
        next(ex)
    }
}


export async function getRoomDetail(req, res, next) {
    try {

        const {roomId} = req.params
        if (!roomId) return next("Please provide room id")

        let rooms = await getRoomQuery({
            type: "private",
            _id: new ObjectId(roomId),
            participants: {
                $elemMatch: {
                    userId: new ObjectId(req.user._id)
                }
            }
        })
        if (rooms.length > 0) {
            res.status(200).json({room: rooms[0]})
        } else {
            next("Room not found")
        }
    } catch (ex) {
        next(ex)
    }
}


// get room message for detail chat like messenger or quick popup chat.
export async function getRoomMessages(req, res, next) {
    // let roomId = req.params.roomId
    let {
        roomId,
        perPage = 10,
        pageNumber = 1,
        orderBy = "createdAt",
        orderDirection = "desc"
    } = req.query
    if (!roomId) return next("Please provide room id")

    if (perPage && perPage > 20) {
        perPage = 20
    }

    perPage = Number(perPage)

    if (isNaN(perPage)) {
        perPage = 20
    }

    pageNumber = Number(pageNumber)
    if (isNaN(pageNumber)) {
        pageNumber = 1
    }

    if (pageNumber <= 0) {
        pageNumber = 1
    }


    roomId = new ObjectId(roomId)

    try {
        let messages = await Message.aggregate([
            {
                $match: {
                    roomId: roomId,

                }
            },
            {
                $lookup: {
                    from: "room",
                    localField: "roomId",
                    foreignField: "_id",
                    as: "room"
                }
            },
            {
                $unwind: {path: "$room"}
            },
            // verify logged has in this room
            {
                $match: {
                    "room.participants": {
                        $elemMatch: {
                            userId: new ObjectId(req.user._id)
                        }
                    }
                }
            },
            {
                $project: {
                    room: 0,
                    roomId: 0,
                }
            },
            {
                $skip: perPage * (pageNumber - 1)
            },
            {
                $limit: perPage * pageNumber
            }
        ])
        res.status(200).json({messages: messages})

    } catch (ex) {
        next(ex)
    }
}


export async function getRoomsMessages(req, res, next) {

    let authId = new ObjectId(req.user._id)

    try {
        let messages = await Room.aggregate([
            {
                $match: {
                    participants: {
                        $elemMatch: {
                            userId: authId
                        }
                    },

                }
            },
            {
                $lookup: {
                    from: "message",
                    localField: "_id",
                    foreignField: "roomId",
                    as: "messages"
                }
            },
            // {
            //     $unwind: {path: "$room"}
            // },
            // // verify logged has in this room
            // {
            //     $match: {
            //         "room.participants": {
            //             $elemMatch: {
            //                 userId: new ObjectId(req.user._id)
            //             }
            //         }
            //     }
            // },
            // {
            //     $project: {
            //         room: 0,
            //         roomId: 0,
            //     }
            // }
        ])

        res.status(200).json({messages: messages})

    } catch (ex) {
        next(ex)
    }
}


// export async function getRoomMessages(req, res, next) {
//     let authId = new ObjectId(req.user._id)
//
//     try {
//         let messages = await Room.aggregate([
//             {
//                 $match: {
//                     participants: {
//                         $elemMatch: {
//                             userId: authId
//                         }
//                     },
//
//                 }
//             },
//             {
//                 $lookup: {
//                     from: "message",
//                     localField: "_id",
//                     foreignField: "roomId",
//                     as: "messages"
//                 }
//             },
//             // {
//             //     $unwind: {path: "$room"}
//             // },
//             // // verify logged has in this room
//             // {
//             //     $match: {
//             //         "room.participants": {
//             //             $elemMatch: {
//             //                 userId: new ObjectId(req.user._id)
//             //             }
//             //         }
//             //     }
//             // },
//             // {
//             //     $project: {
//             //         room: 0,
//             //         roomId: 0,
//             //     }
//             // }
//         ])
//
//         res.status(200).json({messages: messages})
//
//     } catch (ex) {
//         next(ex)
//     }
// }


export async function sendMessage(req, res, next) {
    const {message, roomId} = req.body
    try {

        let newMessage = new Message({
            message,
            roomId: new ObjectId(roomId),
            senderId: new ObjectId(req.user._id)
        })


        newMessage = await newMessage.save()

        // let messages = await getMessageQuery({
        //     $match: {
        //         _id: new ObjectId(newMessage._id)
        //     }
        // })
        // broadcast to friend
        // Trigger a 'message' event on the recipient's private channel
        pusher.trigger(`private-chat-${roomId}`, 'message', {
            message: newMessage
        }).then(a => {
            console.log(a)
        }).catch(ex => {
            console.log(ex.message)
        })

        res.status(201).json({message: newMessage})

    } catch (ex) {
        next(ex)
    }
}