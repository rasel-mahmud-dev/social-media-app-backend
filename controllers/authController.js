import User from "../models/User";
const formidable = require("formidable");
import {createToken, parseToken} from "../jwt";
import {makeHash} from "../bcrypt/bcrypt";
import {cp} from "fs/promises";
import imageUpload from "../services/imageUpload";
import loginService from "../services/loginService";
import createUserService from "../services/createUserService";
import getToken from "../utils/getToken";
import { ObjectId } from 'mongodb';


export const createNewUser = (req, res, next) => {
    // parse a file upload
    const form = formidable({multiples: false});

    form.parse(req, async (err, fields, files) => {
        if (err) return next("Can't read form data");
        try {
            const {
                firstName,
                lastName,
                email,
                password
            } = fields;

            let user = await User.findOne({email});
            if (user) {
                return res.status(404).json({message: "Your are already registered"});
            }


            console.log(files)

            if(files && files.avatar){
                let newPath = files.avatar.filepath.replace(files.avatar.newFilename, files.avatar.originalFilename)
                await cp(files.avatar.filepath, newPath)

                let avatarUrl = "";
        
                let uploadInfo = await imageUpload(newPath, "social-app")
                if (uploadInfo) {
                    avatarUrl = uploadInfo.secure_url
                }

                console.log(uploadInfo)
        
            }


            let hash = makeHash(password);


            let authUser = await createUserService({
                firstName,
                lastName,
                email,
                hash
            })

            let {password: s, ...other} = authUser;


            let token = await createToken(authUser._id, authUser.email, authUser.role);

            res.status(201).json({user: other, token});

        } catch (ex) {
            if (ex.type === "VALIDATION_ERROR") {
                next(ex.errors);
            } else if (ex.type === "ER_DUP_ENTRY") {
                next("user already exists");
            } else {
                next(ex);
            }
        }
    });
};


export const updateProfile = (req, res, next) => {

    // parse a file upload
    const form = formidable({multiples: false});

    form.parse(req, async (err, fields, files) => {
        if (err) return next("Can't read form data");
        try {
            const {
                firstName,
                lastName,
                email,
                avatar
            } = fields;

            let user = await User.findOne({_id: new ObjectId(req.user._id)});
            if (!user) {
                return res.status(404).json({message: "Profile not found"});
            }

            let avatarUrl = "";

            if(files && files.avatar){
                let newPath = files.avatar.filepath.replace(files.avatar.newFilename, files.avatar.originalFilename)
                await cp(files.avatar.filepath, newPath)

                let result = await imageUpload(newPath)
                console.log(result)

                // let uploadInfo = await imageUpload(sirvUploadImage, "social-app")
                // if (uploadInfo) {
                //     avatarUrl = uploadInfo.secure_url
                // }
            }


            let update = {}
            if(firstName) update["firstName"] = firstName
            if(lastName) update["lastName"] = lastName
            if(email) update["email"] = email
            if(avatar) update["avatar"] = avatar
            if(avatarUrl) update["avatar"] = avatarUrl


            let result = await User.updateOne({
                _id: new ObjectId(req.user._id)
            }, {
                $set: update
            })

            console.log(result)

            res.status(201).json({user: {}});

        } catch (ex) {
            next(ex);
        }

    });
};

export const login = async (req, res, next) => {
    try {
        const {email, password} = req.body;

        let {token, userData} = await loginService(email, password)

        res.status(201).json({token, user: userData});
    } catch (ex) {
        console.log(ex)
        next(ex);
    }
};


    export const verifyAuth = async (req, res, next) => {

        let token = getToken(req)
    
        try {
            let data = await parseToken(token)
        
            if (!data) {
                return res.status(409).json({message: "Please login first"})
            }
    
            let user = await User.findOne({_id: new ObjectId(data._id)})
    
            if (!user) {
                return res.status(409).json({message: "Please login first"})
            }
    
            user["password"] = null
    
            res.status(201).json({
                user,
            })
    
        } catch (ex) {
            next(ex)
        }
    }

