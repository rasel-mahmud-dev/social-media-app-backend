import {
    sendMessage,
    getMessages,
    getGroupMessages,
    getGroupsMessages,
    getGroups, createGroup, getGroupDetail
} from "../controllers/chatController";


import {auth} from "../middlewares";
import formidable from "formidable";
import pusher from "../pusher/pusher";

const router = require("express").Router();


router.get("/",  auth, getMessages);


// get each groups 1 message for chats and messenger sidebar
router.get("/groups/messages",  auth, getGroupsMessages);



// get group message for detail chat like messenger or quick popup chat.
router.get("/group/messages",  auth, getGroupMessages);


router.get("/groups",  auth, getGroups);

router.get("/group/:groupId",  auth, getGroupDetail);


router.post("/group",  auth, createGroup);


// private or group message
router.get("/messages/:groupId",  auth, getGroupMessages);


router.post("/send",  auth, sendMessage);



export default router
