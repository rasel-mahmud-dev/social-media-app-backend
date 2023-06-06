import User from "../models/User";
const formidable = require("formidable");
import {createToken} from "../jwt";
import {makeHash} from "../bcrypt/bcrypt";
import {cp} from "fs/promises";
import imageUpload from "../services/imageUpload";
import createUserService from "../services/createUserService";


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

            let newPath = files.avatar.filepath.replace(files.avatar.newFilename, files.avatar.originalFilename)
            await cp(files.avatar.filepath, newPath)

            let avatarUrl = "";

      
            let uploadInfo = await imageUpload(newPath, "social-app")
            if (uploadInfo) {
                avatarUrl = uploadInfo.secure_url
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

