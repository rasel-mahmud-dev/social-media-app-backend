import {ObjectId} from "mongodb";
import Room from "../models/Room";

import * as yup from "yup"
import formidable from "formidable";
import Group from "src/models/Group";
import imageKitUpload from "src/services/ImageKitUpload";
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
        let pages = await Page.find({})
        res.status(200).json({pages: pages})

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

        const {pageName} = req.params
        console.log(pageName)
        if (!pageName) return next("Please provide page name")
        let pages = await Page.aggregate([
            {
                $match: {
                    name: pageName
                }
            }
        ])

        if (pages.length > 0) {
            res.status(200).json({page: pages[0]})
        } else {
            next("page not found")
        }
    } catch (ex) {
        next(ex)
    }
}


export async function getPagePosts(req, res, next) {
    try {

        const {pageName} = req.params

        if (!pageName) return next("Please provide page name")
        let pages = await Page.aggregate([
            {
                $match: {
                    name: pageName
                }
            }
        ])

        res.status(200).json({page: pages})

    } catch (ex) {
        next(ex)
    }
}


