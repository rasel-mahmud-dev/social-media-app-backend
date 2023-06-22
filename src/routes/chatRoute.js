import {
    sendMessage,
    getMessages,
    getRoomMessages,
    getRoomsMessages,
    getRooms, createRoom, getRoomDetail
} from "../controllers/chatController";


import {auth} from "../middlewares";


const router = require("express").Router();


router.get("/",  auth, getMessages);


// get each rooms 1 message for chats and messenger sidebar
router.get("/rooms/messages",  auth, getRoomsMessages);



// get room message for detail chat like messenger or quick popup chat.
router.get("/room/messages",  auth, getRoomMessages);


router.get("/rooms",  auth, getRooms);

router.get("/room/:roomId",  auth, getRoomDetail);


router.post("/room",  auth, createRoom);


// private or room message
router.get("/messages/:roomId",  auth, getRoomMessages);


router.post("/send",  auth, sendMessage);



export default router
