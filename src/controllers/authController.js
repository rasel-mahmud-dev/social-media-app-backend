import User from "../models/User";
import {createToken, parseToken} from "../jwt";
import {makeHash} from "../bcrypt/bcrypt";
import loginService from "../services/loginService";
import createUserService from "../services/createUserService";
import getToken from "../utils/getToken";
import {ObjectId} from 'mongodb';
import imageKitUpload from "../services/ImageKitUpload";
import oauth2Client from "../services/googeAuth";
import {google} from "googleapis";
import Profile from "../models/Profile";
import Media from "../models/Media";

const formidable = require("formidable");


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
                password,
                gender,
                birthDay
            } = fields;

            let user = await User.findOne({email});
            if (user) {
                return res.status(404).json({message: "Your are already registered"});
            }

            let avatarUrl = "";

            if (files && files.avatar) {
                let fileName = files.avatar.newFilename + "-" + files.avatar.originalFilename
                let uploadInfo = await imageKitUpload(files.avatar.filepath, fileName, "social-app")
                if (uploadInfo) {
                    avatarUrl = uploadInfo.url
                }
            }

            let hash = makeHash(password);

            let authUser = await createUserService({
                firstName,
                lastName,
                email,
                hash,
                avatarUrl
            })

            let {password: s, ...other} = authUser;

            Profile.updateOne({
                userId: new ObjectId(authUser._id)
            }, {
                userId: new ObjectId(authUser._id),
                gender,
                dateOfBrith: birthDay
            }, {
                upsert: true
            }).catch(ex => {
            })

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
    const form = formidable({multiples: true});

    form.parse(req, async (err, fields, files) => {
        if (err) return next("Can't read form data");
        try {
            const {
                firstName,
                lastName,
                email,
                avatar,
                cover
            } = fields;

            let user = await User.findOne({_id: new ObjectId(req.user._id)});
            if (!user) {
                return res.status(404).json({message: "Profile not found"});
            }

            let update = {}
            let errorMessage = ""

            if (firstName) update["firstName"] = firstName
            if (lastName) update["lastName"] = lastName
            if (email) update["email"] = email
            if (avatar) update["avatar"] = avatar
            if (cover) update["cover"] = cover
            const newPhotos = []


            if (files && files.avatar) {
                let fileName = `${files.avatar.newFilename}-${files.avatar.originalFilename}`
                let result = await imageKitUpload(files.avatar.filepath, fileName, "social-app")
                if (result) {
                    update["avatar"] = result.url
                    newPhotos.push(result.url)
                } else {
                    errorMessage = "Avatar upload fail"
                }
            }

            if (files && files.cover) {
                let fileName = `${files.cover.newFilename}-${files.cover.originalFilename}`
                let result = await imageKitUpload(files.cover.filepath, fileName, "social-app")
                if (result) {
                    update["cover"] = result.url
                    newPhotos.push(result.url)
                } else {
                    errorMessage = "Cover Image upload fail"
                }
            }

            if (errorMessage) {
                return next(errorMessage)
            }

            let result = await User.updateOne({
                _id: new ObjectId(req.user._id)
            }, {
                $set: update
            })

            if (newPhotos.length > 0) {
                Media.insertMany(newPhotos.map(img => ({
                    type: "image/jpg",
                    url: img,
                    userId: new ObjectId(req.user._id),
                    feedId: null
                }))).catch(ex => {
                })
            }

            res.status(201).json({user: update});

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
        next(ex);
    }
};


export const loginWithGoogle = async (req, res, next) => {
    try {
        const {code} = req.query;

        // Exchange the authorization code for access and refresh tokens
        const {tokens} = await oauth2Client.getToken(code);

        // Set the access and refresh tokens for further API calls
        oauth2Client.setCredentials(tokens);

        // Get the user's email using the Google People API
        const peopleApi = google.people({version: 'v1', auth: oauth2Client});
        const {data} = await peopleApi.people.get({
            resourceName: 'people/me',
            personFields: 'emailAddresses,names,photos,metadata',
        });

        // Extract the email address from the response
        const email = data.emailAddresses[0].value;
        const avatar = data.photos[0].url;
        const lastName = data.names[0].familyName;
        const firstName = data.names[0].givenName;
        const fullName = data.names[0].displayName;
        const uniqueId = data.metadata.sources[0].id; // Retrieve the unique ID


        let user = await User.findOne({
            $or: [
                {googleId: uniqueId},
                {email: email},
            ]
        })

        if (!user) {
            user = {
                googleId: uniqueId,
                avatar: avatar,
                lastName: lastName,
                firstName: firstName,
                fullName: fullName,
                password: null,
                createdAt: new Date(),
                updatedAt: new Date(),
                role: "USER",
            }
            let result = await User.updateOne({
                googleId: uniqueId,
            }, {
                $set: user
            }, {
                upsert: true
            })
            if (result && result.upsertedId) {
                user._id = result.upsertedId
            }
        }

        let token = await createToken(user._id, user.email, user.role)
        // res.status(201).json({token, user: user});
        res.redirect(process.env.FRONTEND + "/join?token=" + token)
    } catch (ex) {
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

