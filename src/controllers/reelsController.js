import * as yup from "yup";
import {ObjectId} from "mongodb";
import Reels from "src/models/Reels";




export function getReels(req, res, next) {

}


export async function createReel(req, res, next) {
    try {
        const {
            videoUrl,
            caption,
            duration,
            isPrivate = false,
            hashtags = [],
            meta = {},
            mentions = [],
            thumbnailUrl = ""
        } = req.body

        let schema = yup.object({
            videoUrl: yup.string().required().max(1000),
            duration: yup.string().max(50000)
        })

        await schema.validate({
            videoUrl,
            duration
        })


        let payload = {
            caption,
            userId: new ObjectId(req.user._id),
            hashtags,
            videoUrl,
            mentions,
            isPrivate: isPrivate,
            thumbnailUrl,
            meta
        }

        // create a room if there are not exist this room
        let result = await new Reels(payload)
        result = await result.save()

        res.status(201).json({reel: result})

    } catch (ex) {
        next(ex)
    }
}