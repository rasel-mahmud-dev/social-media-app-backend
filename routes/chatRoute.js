import {
    sendMessage,
    getMessages,
    getGroupMessages,
    getGroupsMessages,
    getGroups, createGroup
} from "../controllers/chatController";
import {auth} from "../middlewares";
import formidable from "formidable";
import pusher from "../pusher/pusher";

const router = require("express").Router();


router.get("/",  auth, getMessages);


// get each groups 1 message for chats and messenger sidebar
router.get("/groups/messages",  auth, getGroupsMessages);


router.get("/groups",  auth, getGroups);


router.post("/group",  auth, createGroup);


// private or group message
router.get("/messages/:groupId",  auth, getGroupMessages);


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
