import Message from "../models/Message";
import {ObjectId} from "mongodb";
import pusher from "../pusher/pusher";
import Group from "../models/Group";

import * as yup from "yup"


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


function getGroupQuery(match = {}) {
    return Group.aggregate([
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

// create chat group
export async function createGroup(req, res, next) {
    try {
        const {name, type, participants} = req.body

        let schema = yup.object({
            participants: yup.array().min(1, "Please provide members").of(yup.string()),
            name: yup.string().max(100),
            type: yup.string().oneOf(["private", "group", "public"])
        })

        await schema.validate({
            name,
            type,
            participants
        })

        let payload = {
            name,
            type,
            participants: participants.map(userId => ({userId: new ObjectId(userId)}))
        }

        payload.participants.push({userId: new ObjectId(req.user._id)})

        if (payload.participants.length < 2) {
            return next("Group creation fail")
        }

        // create group if there are not exist this group
        await Group.updateOne({
            ...payload
        }, {
            $set: payload
        }, {
            upsert: true
        })

        let groups = await getGroupQuery(payload)
        res.status(201).json({group: groups[0]})

    } catch (ex) {
        next(ex)
    }
}


export async function getGroups(req, res, next) {
    try {
        // const {limit, pageSize} = req.query
        //
        // const loggedUserId = new ObjectId(req.user._id)
        //
        // let limitInt = Number(limit ? limit : 10)
        // if (isNaN(limitInt)) {
        //     limitInt = 10
        // }

        let groups = await getGroupQuery({
            type: "private",
            participants: {
                $elemMatch: {
                    userId: new ObjectId(req.user._id)
                }
            }
        })

        // console.log(groups)

        res.status(200).json({groups: groups})


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
        //         $group: {
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


export async function getGroupDetail(req, res, next) {
    try {

        const {groupId} = req.params
        if (!groupId) return next("Please provide group id")

        let groups = await getGroupQuery({
            type: "private",
            _id: new ObjectId(groupId),
            participants: {
                $elemMatch: {
                    userId: new ObjectId(req.user._id)
                }
            }
        })
        if (groups.length > 0) {
            res.status(200).json({group: groups[0]})
        } else {
            next("Group not found")
        }
    } catch (ex) {
        next(ex)
    }
}


// get group message for detail chat like messenger or quick popup chat.
export async function getGroupMessages(req, res, next) {
    // let groupId = req.params.groupId
    let {
        groupId,
        perPage = 10,
        pageNumber = 1,
        orderBy = "createdAt",
        orderDirection = "desc"
    } = req.query
    if (!groupId) return next("Please provide group id")

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


    groupId = new ObjectId(groupId)

    try {
        let messages = await Message.aggregate([
            {
                $match: {
                    groupId: groupId,

                }
            },
            {
                $lookup: {
                    from: "group",
                    localField: "groupId",
                    foreignField: "_id",
                    as: "group"
                }
            },
            {
                $unwind: {path: "$group"}
            },
            // verify logged has in this group
            {
                $match: {
                    "group.participants": {
                        $elemMatch: {
                            userId: new ObjectId(req.user._id)
                        }
                    }
                }
            },
            {
                $project: {
                    group: 0,
                    groupId: 0,
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


export async function getGroupsMessages(req, res, next) {

    let authId = new ObjectId(req.user._id)

    try {
        let messages = await Group.aggregate([
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
                    foreignField: "groupId",
                    as: "messages"
                }
            },
            // {
            //     $unwind: {path: "$group"}
            // },
            // // verify logged has in this group
            // {
            //     $match: {
            //         "group.participants": {
            //             $elemMatch: {
            //                 userId: new ObjectId(req.user._id)
            //             }
            //         }
            //     }
            // },
            // {
            //     $project: {
            //         group: 0,
            //         groupId: 0,
            //     }
            // }
        ])

        res.status(200).json({messages: messages})

    } catch (ex) {
        next(ex)
    }
}


// export async function getGroupMessages(req, res, next) {
//     let authId = new ObjectId(req.user._id)
//
//     try {
//         let messages = await Group.aggregate([
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
//                     foreignField: "groupId",
//                     as: "messages"
//                 }
//             },
//             // {
//             //     $unwind: {path: "$group"}
//             // },
//             // // verify logged has in this group
//             // {
//             //     $match: {
//             //         "group.participants": {
//             //             $elemMatch: {
//             //                 userId: new ObjectId(req.user._id)
//             //             }
//             //         }
//             //     }
//             // },
//             // {
//             //     $project: {
//             //         group: 0,
//             //         groupId: 0,
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
    const {message, groupId} = req.body
    try {

        let newMessage = new Message({
            message,
            groupId: new ObjectId(groupId),
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
        pusher.trigger(`private-chat-${groupId}`, 'message', {
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