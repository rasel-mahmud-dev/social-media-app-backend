import {
    sendMessage,
    getMessages,
    getChannelMessages,
    getGroups
} from "../controllers/chatController";
import {auth} from "../middlewares";
import formidable from "formidable";
import pusher from "../pusher/pusher";

const router = require("express").Router();

router.get("/",  auth, getMessages);


router.get("/groups",  auth, getGroups);

// private or group message
router.get("/:channelName",  auth, getChannelMessages);

router.post("/send",  auth, sendMessage);

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

export default router
