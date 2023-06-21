import Follow from "../models/Follow";
import * as yup from "yup";
import {ObjectId} from "mongodb";

export async function addFollow(req, res, next){
    try{
        const { following, piority = "1"} = req.body
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
            following:  new ObjectId(following)
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

        if(result.acknowledged && result.upsertedId){
            // create new one

        } else if(result.acknowledged && result.matchedCount){
            // update or matched
            console.log("updated exist one")
        } else{

        }
        console.log(result)
        res.send("hi")

    } catch(ex) {
        next(ex)
    }
}