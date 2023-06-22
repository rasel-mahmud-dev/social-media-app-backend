import Follow from "../models/Follow";
import * as yup from "yup";
import {ObjectId} from "mongodb";

export async function addFollow(req, res, next) {
    try {
        const {following, piority = "1"} = req.body
        let schema = yup.object({
            following: yup.string().length(24, "Please provide valid following user id"),
            piority: yup.string().oneOf(["1", "2", "3"], "Please set piority")
        })

        await schema.validate({
            following,
            piority
        })

        let payload = {
            follower: new ObjectId(req.user._id),
            following: new ObjectId(following)
        }
        let result = await Follow.updateOne(payload, {
                $set: {
                    ...payload,
                    piority: Number(piority),
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            },
            {
                upsert: true
            })

        if (result.acknowledged && result.upsertedId) {
            // create new one

        } else if (result.acknowledged && result.matchedCount) {
            // update or matched
            console.log("updated exist one")
        } else {
        }
        res.status(201).json({})
    } catch (ex) {
        next(ex)
    }
}

export async function removeFollow(req, res, next) {
    try {
        const {following} = req.body
        let schema = yup.object({
            following: yup.string().length(24, "Please provide valid following user id"),
        })

        await schema.validate({
            following
        })

        let payload = {
            follower: new ObjectId(req.user._id),
            following: new ObjectId(following)
        }
        let result = await Follow.deleteOne(payload)
        res.status(201).json({})

    } catch (ex) {
        next(ex)
    }
}


//check following status
export async function followStatus(req, res, next) {
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