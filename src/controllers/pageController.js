import {ObjectId} from "mongodb";
import Room from "../models/Room";

import * as yup from "yup"
import formidable from "formidable";
import Group from "src/models/Group";
import imageKitUpload from "src/services/ImageKitUpload";
import Membership from "src/models/Membership";
import Page from "src/models/Page";


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


export async function discoverPages(req, res, next) {
    try {
        let groups = await Group.find({})
        res.status(200).json({groups: groups})

    } catch (ex) {
        next(ex)
    }
}

// feeds for a specific group
export async function getMyPages(req, res, next) {
    try {

        let {pageNumber = "1"} = req.query

        const limit = 3;

        pageNumber = Number(pageNumber)
        if (isNaN(pageNumber)) {
            pageNumber = 1
        }

        let pages = []

        pages = await Page.find({
            ownerId: new ObjectId(req.user._id)
        })

        res.status(200).json({pages: pages})

    } catch (ex) {
        next(ex)
    }
}


// create chat room
export async function createPage(req, res, next) {
    const form = formidable({multiple: false})
    form.parse(req, async function (err, fields, files) {
        try {
            const {name, bio, _id = "", category = ""} = fields

            let schema = yup.object({
                name: yup.string().required().max(100),
                category: yup.string().max(100)
            })

            await schema.validate({
                name,
                category
            })

            let isExist = await Page.findOne({name})
            if (isExist) return next("This name is already used in someone page")

            let payload = {
                name,
                ownerId: new ObjectId(req.user._id),
                bio,
                slug: name,
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

            if (files?.logo) {
                let fileName = files?.logo.newFilename + "-" + files?.logo.originalFilename + ".jpg"
                try {
                    let result = await imageKitUpload(files?.logo?.filepath, fileName, "social-app")
                    if (result && result?.url) {
                        payload.logo = result.url
                    }
                } catch (ex) {

                }
            }


            // create a room if there are not exist this room
            let result = await Page.updateOne({
                ownerId: payload.ownerId,
                _id: _id ? new ObjectId(_id) : new ObjectId()
            }, {
                $set: payload
            }, {
                upsert: true
            })


            res.status(201).json({message: "page has been created."})

        } catch (ex) {
            next(ex)
        }
    })
}


export async function getPageDetail(req, res, next) {
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
        let isMember = false
        let role = "user"

        if (groups.length > 0) {
            if (groups[0].ownerId === req.user._id) {
                isMember = true
                role = "admin"
            } else {
                let member = await Membership.findOne({groupId: new ObjectId(groups[0]._id)})
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


