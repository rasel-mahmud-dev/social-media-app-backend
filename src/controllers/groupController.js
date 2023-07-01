import {ObjectId} from "mongodb";
import Room from "../models/Room";

import * as yup from "yup"
import formidable from "formidable";
import Group from "src/models/Group";
import imageKitUpload from "src/services/ImageKitUpload";
import jsonParse from "src/utils/jsonParse";
import Membership from "src/models/Membership";
import Invitation from "src/models/Invitation";
import notificationEvent from "src/services/notification";
import Feed from "src/models/Feed";
import slugify from "slugify";


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

export async function getMyGroups(req, res, next) {
    try {
        let groups = await Group.aggregate([
            {
                $lookup: {
                    from: "membership",
                    let: {groupId: "$_id"},
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        {
                                            $eq: ["$groupId", "$$groupId"],
                                        },
                                        {
                                            $eq: ["$userId", new ObjectId(req.user._id)],//right table (membership) userId
                                        }
                                    ]
                                }
                            }
                        }
                    ],
                    as: "members"
                }
            },
            {
                $match: {
                    $or: [
                        { $expr: { $gt: [{ $size: "$members" }, 0] } },
                        {ownerId: new ObjectId(req.user._id)},
                    ]
                }
            },
            // {
            //     $lookup: {
            //         from: "membership",
            //         let: {groupId: "$_id"},
            //         as: "allMembers"
            //     }
            // },
            {
                $addFields: {
                    totalMember: {
                        $size: "$members"
                    }
                }
            },

        ])
        res.status(200).json({groups: groups})

    } catch (ex) {
        next(ex)
    }
}


export async function discoverGroups(req, res, next) {
    try {
        let groups = await Group.aggregate([
            {
                $lookup: {
                    from: "membership",
                    let: {groupId: "$_id"},
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        {
                                            $eq: ["$groupId", "$$groupId"],
                                        },
                                        {
                                            $ne: ["$userId", new ObjectId(req.user._id)],//right table (membership) userId
                                        }
                                    ]
                                }
                            }
                        }
                    ],
                    as: "members"
                }
            },
        ])
        res.status(200).json({groups: groups})

    } catch (ex) {
        next(ex)
    }
}

// feeds for a specific group
export async function getGroupFeeds(req, res, next) {
    try {

        let {groupId, pageNumber = "1"} = req.query

        const limit = 3;

        pageNumber = Number(pageNumber)
        if (isNaN(pageNumber)) {
            pageNumber = 1
        }


        let feeds = []

        feeds = await Feed.aggregate([
            {
                $match: {
                    type: "group",
                    groupId: new ObjectId(groupId)
                },
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
                $unwind: {path: "$author"}
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
                $unwind: {path: "$comments", preserveNullAndEmptyArrays: true} // Unwind the "comments" array
            },
            {
                $lookup: {
                    from: "users",
                    localField: "comments.userId",
                    foreignField: "_id",
                    as: "comments.author"
                }
            },
            {
                $unwind: {path: "$comments.author", preserveNullAndEmptyArrays: true}
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
                    likes: {
                        "feedId": 0,
                        "createdAt": 0,
                        "updatedAt": 0
                    },
                    // comment: { $slice: ["$comments", 1] }
                }
            }

        ])

        res.status(200).json({feeds: feeds})

    } catch (ex) {
        next(ex)
    }
}


// create chat room
export async function createGroup(req, res, next) {
    const form = formidable({multiple: false})
    form.parse(req, async function (err, fields, files) {
        try {
            const {name, description, isPublic = "1", _id = "", members = "[]"} = fields

            let schema = yup.object({
                name: yup.string().required().max(100),
                description: yup.string().max(5000)
            })

            await schema.validate({
                name,
                description
            })

            let groupSlug = slugify(name, {lower: true})
            let isExist = await Group.findOne({slug: groupSlug})
            if (isExist) return next("This name is already used in someone group")

            let payload = {
                name,
                slug: groupSlug,
                ownerId: new ObjectId(req.user._id),
                description,
                isPublic: isPublic === "1",
                coverPhoto: "",
                createdAt: new Date()
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
                $set: payload
            }, {
                upsert: true
            })

            if (result.upsertedId) {
                let membersArray = [
                    {
                        groupId: new ObjectId(result.upsertedId),
                        joinedAt: new Date(),
                        role: "admin",
                        userId: new ObjectId(req.user._id)
                    }
                ]

                if (members) {
                    let mArray = await jsonParse(members)
                    if (mArray && Array.isArray(mArray)) {
                        mArray.forEach(userId => {
                            membersArray.push({
                                groupId: new ObjectId(result.upsertedId),
                                joinedAt: new Date(),
                                role: "user",
                                userId: new ObjectId(userId)
                            })
                        })
                    }
                }

                await Membership.insertMany(membersArray)

                res.status(201).json({message: "group has been created."})
            } else {
                res.status(500).json({message: "group Create fail."})
            }

        } catch (ex) {
            next(ex)
        }
    })
}


export async function getGroupDetail(req, res, next) {
    try {


        const {groupSlug} = req.params
        if (!groupSlug) return next("Please provide groupSlug")


        let groups = await Group.aggregate([
            {
                $match: {
                    slug: groupSlug
                }
            },
            {
                $lookup: {
                    from: "membership",
                    let: {groupId: "$_id"},
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        {
                                            $eq: ["$groupId", "$$groupId"],
                                        },
                                        {
                                            $eq: ["$userId", new ObjectId(req.user._id)],//right table (membership) userId
                                        }
                                    ]
                                }
                            }
                        }
                    ],
                    as: "members"
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "members.userId",
                    foreignField: "_id",
                    as: "membersTemp"
                }
            },
            {
                $project: {
                    membersTemp: 0,
                    "members.user._id": 0,
                    "members.user.firstName": 0,
                    "members.user.lastName": 0,
                    "members.user.password": 0,
                    "members.user.createdAt": 0,
                    "members.user.updatedAt": 0,
                    "members.user.friends": 0,
                    "members.user.cover": 0,
                    "members.user.email": 0,
                    "members.user.role": 0,
                }
            }
        ])
        let isMember = false
        let role = "user"

        if (groups.length > 0) {
            if (groups[0]?.ownerId.toString() === req.user._id) {

                isMember = true
                role = "admin"
            } else {
                let member = await Membership.findOne({
                    userId: new ObjectId(req.user._id),
                    groupId: new ObjectId(groups[0]._id)
                })
                if (member) {
                    role = member.role
                    isMember = true
                }
            }
            res.status(200).json({group: groups[0], role, isYouMember: isMember})
        } else {
            next("group not found")
        }
    } catch (ex) {
        next(ex)
    }
}


export async function addInvitePeople(req, res, next) {
    try {


        const {groupId, peoples = []} = req.body
        if (!groupId) return next("Please provide groupId")

        let group = await Group.findOne({_id: new ObjectId(groupId)})
        if (!group) return next("This group is not exists")

        const operation = peoples.map(peopleId => ({
            updateOne: {
                filter: {
                    senderId: new ObjectId(req.user._id),
                    groupId: new ObjectId(groupId),
                    recipientId: new ObjectId(peopleId),
                },
                update: {
                    $set: {
                        senderId: new ObjectId(req.user._id),
                        groupId: new ObjectId(groupId),
                        recipientId: new ObjectId(peopleId),
                        createdAt: new Date()
                    }
                },
                upsert: true
            }
        }))

        let result = await Invitation.bulkWrite(operation)

        peoples.forEach(peopleId => {
            notificationEvent.emit("notification", {
                message: `{firstName} you are invited to join ${group.name} group`,
                recipientId: peopleId,
                notificationType: "group-invitation",
                groupId: groupId,
                senderId: req.user._id,
            })
        })

        res.status(201).json({message: ""})

    } catch (ex) {
        next(ex)
    }
}


export async function acceptInvitation(req, res, next) {
    try {

        let schema = yup.object({
            groupId: yup.string().required("Please provide groupId").length(24)
        })

        const {groupId} = req.body

        await schema.validate({
            groupId: groupId
        })


        let group = await Group.findOne({_id: new ObjectId(groupId)})
        if (!group) return next("This group is not exists")

        let invitation = await Invitation.findOne({
            groupId: new ObjectId(groupId),
            recipientId: new ObjectId(req.user._id)
        })

        console.log(invitation, groupId)

        // Invitation.updateOne({})

        // const operation = peoples.map(peopleId => ({
        //     updateOne: {
        //         filter: {
        //             senderId: new ObjectId(req.user._id),
        //             groupId: new ObjectId(groupId),
        //             recipientId: new ObjectId(peopleId),
        //         },
        //         update: {
        //             $set: {
        //                 senderId: new ObjectId(req.user._id),
        //                 groupId: new ObjectId(groupId),
        //                 recipientId: new ObjectId(peopleId),
        //                 createdAt: new Date()
        //             }
        //         },
        //         upsert: true
        //     }
        // }))
        //
        // let result = await Invitation.bulkWrite(operation)
        //
        // peoples.forEach(peopleId => {
        //     notificationEvent.emit("notification", {
        //         message: `{firstName} you are invited to join ${group.name} group`,
        //         recipientId: peopleId,
        //         notificationType: "group-invitation",
        //         groupId: groupId,
        //         senderId: req.user._id,
        //     })
        // })

        res.status(201).json({message: ""})

    } catch (ex) {
        next(ex)
    }
}


export async function getGroupMembers(req, res, next) {
    try {
        let schema = yup.object({
            groupId: yup.string().required("Please provide groupId").length(24)
        })

        let {groupId, pageNumber = "1", type = ""} = req.query

        const limit = 10;

        pageNumber = Number(pageNumber)
        if (isNaN(pageNumber)) {
            pageNumber = 1
        }

        await schema.validate({
            groupId: groupId
        })

        let group = await Group.findOne({_id: new ObjectId(groupId)})
        if (!group) return next("This group is not exists")

        let matchStage = {}
        let count = 0
        if (type === "admin") {
            matchStage = {
                $match: {
                    role: {$in: ["admin", "moderator"]},
                    groupId: new ObjectId(groupId)
                }
            }
        } else {
            matchStage = {
                $match: {
                    groupId: new ObjectId(groupId)
                }
            }

            if (pageNumber === 1) {
                count = await Membership.countDocuments({groupId: new ObjectId(groupId)}) || 1
            }

        }

        let members = await Membership.aggregate([
            matchStage,
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "user"
                }
            },
            {
                $unwind: {path: "$user"}
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
            {
                $project: {
                    user: {
                        password: 0,
                        role: 0,
                        createdAt: 0,
                        updatedAt: 0,
                        email: 0,
                    }
                }
            }
        ])

        res.status(200).json({members: members, totalMembers: count})

    } catch (ex) {
        next(ex)
    }
}


