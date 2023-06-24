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
        let groups = await Group.find({
            ownerId: new ObjectId(req.user._id),
        })
        res.status(200).json({groups: groups})

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

        const {groupId} = req.params
        if (!groupId) return next("Please provide groupId")

        let groups = await Group.aggregate([
            {
                $match: {
                    _id: new ObjectId(groupId)
                }
            },
            {
                $lookup: {
                    from: "membership",
                    localField: "_id",
                    foreignField: "groupId",
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
                $addFields: {
                    members: {
                        $map: {
                            input: "$members",
                            as: "member",
                            in: {
                                $mergeObjects: [
                                    "$$member",
                                    {
                                        user: {
                                            $arrayElemAt: [
                                                {
                                                    $filter: {
                                                        input: "$membersTemp",
                                                        cond: {$eq: ["$$this._id", "$$member.userId"]}
                                                    }
                                                },
                                                0
                                            ]
                                        }
                                    }
                                ]
                            }
                        }
                    }
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

        if (groups.length > 0) {
            res.status(200).json({group: groups[0]})
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
                notificationType: "invitation",
                groupId: groupId,
                senderId: req.user._id,
            })
        })

        res.status(201).json({message: ""})

    } catch (ex) {
        next(ex)
    }
}


