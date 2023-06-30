import {
    createNewUser,
    login,
    loginWithGoogle,
    updateProfile,
    verifyAuth
} from "../controllers/authController";
import {auth} from "../middlewares";
import  {authUrl} from "../services/googeAuth";
import formidable from "formidable";
import pusher from "../pusher/pusher";
import {imageKitAuthenticationParameters} from "src/services/ImageKitUpload";

const ImageKit = require("imagekit");
const fs = require('fs');


const router = require("express").Router();

router.post("/registration", createNewUser);
router.post("/login", login);
router.get("/fetch-auth", verifyAuth);
router.post("/update-profile", auth, updateProfile);


// Redirect users to the authentication URL
router.get('/google', (req, res) => {
    res.redirect(authUrl);
});

// Handle the callback from Google after authentication
router.get('/callback/google', loginWithGoogle);



// pusher authorization for private message.
router.post("/pusher/auth", (req, res) => {
    let form = formidable()
    form.parse(req, (err, fields)=>{
        const socketId = fields.socket_id;
        const channel = fields.channel_name;
        // This authenticates every user. Don't do this in production!
        const authResponse = pusher.authorizeChannel(socketId, channel);
        res.send(authResponse);
    })
});



router.get("/imagekit-authenticationEndpoint", auth, (req, res)=>{
    let result = imageKitAuthenticationParameters()
    res.status(200).send(result)
})


export default router