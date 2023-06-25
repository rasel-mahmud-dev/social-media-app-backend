import Notification from "src/models/Notification";

import Follow from "../models/Follow";
import * as yup from "yup";
import {ObjectId} from "mongodb";

export async function getNotifications(req, res, next) {

    let {
        perPage = 20,
        pageNumber = 1,
        orderBy = "createdAt",
        orderDirection = "desc"
    } = req.query


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

    try {
        let notifications = await Notification.aggregate([
            {
                $match: {}
            },
            {
                $lookup: {
                    from: "users",
                    foreignField: "_id",
                    localField: "senderId",
                    as: "sender"
                }
            },
            {
                $unwind: {path: "$sender"}
            },
            {
                $lookup: {
                    from: "groups",
                    foreignField: "_id",
                    localField: "groupId",
                    as: "group"
                }
            },
            {
                $unwind: {path: "$group", preserveNullAndEmptyArrays: true}
            },
            {
                $sort: {
                    timestamp: -1
                }
            },
            {
                $skip: perPage * (pageNumber - 1)
            },
            {
                $limit: perPage * pageNumber
            }
        ])
        res.status(200).json({notifications: notifications})

    } catch (ex) {
        next(ex)
    }
}


//check the following status
export async function getNotificationDetail() {
    try {
        const {userId} = req.query
        let schema = yup.object({
            userId: yup.string().length(24, "Please provide valid following user id"),
        })

        await schema.validate({
            userId,
        })

        let payload = {
            follower: new ObjectId(req.user._id),
            following: new ObjectId(userId)
        }
        let result = await Follow.findOne(payload)
        res.status(200).send({following: result})
    } catch (ex) {
        next(ex)
    }
}

