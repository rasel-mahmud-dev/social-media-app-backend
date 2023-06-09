import {ObjectId} from "mongodb";
import Saved from "../models/Saved";
import Story from "../models/Story";
import formidable from "formidable"
import path from "path";
import {cp} from "fs/promises";

function getStoryQuery(match) {
    return Story.aggregate([
        match ? match : {$match: {}},
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
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                author: {
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

// get all feed comments
export const getStories = async (req, res, next) => {
    try {
        let stories = await getStoryQuery({
            $match: {
                userId: new ObjectId(req.user._id)
            }
        })
        res.status(200).json({stories});
    } catch (ex) {
        next(ex);
    }
}


// create feed
export const createStory = async (req, res, next) => {
    // parse a file upload

    const form = formidable({multiple: true})

    form.parse(req, async function (err, fields, files){
        if(err) return next("Internal error");

        try {

            const { newFilename, filepath, originalFilename} = files.image

            let newUrl = "public/stories/" + newFilename + "-" + originalFilename
            await cp(filepath, path.resolve(newUrl))

            let newStory = new Story({
                media: [{url: newUrl, type: "image"}],
                content: "",
                userId: new ObjectId(req.user._id),
            })

            newStory = await newStory.save()

            let story = await getStoryQuery({
                $match: {
                    _id: new ObjectId(newStory._id)
                }
            })

            res.status(201).json({story: story[0]})

        } catch (ex) {
            next("Saved fail");
        }
    })
};
