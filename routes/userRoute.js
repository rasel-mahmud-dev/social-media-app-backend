import {auth} from "../middlewares"
import {
    acceptFriendRequest,
    addFriend,
    getFriends,
    getUsers, rejectFriendRequest,
    removeFriend
} from "../controllers/userController";

const router = require("express").Router();

router.get("/", auth, getUsers);
router.get("/friends", auth, getFriends);
router.post("/add-friend", auth, addFriend);
router.post("/remove-friend", auth, removeFriend);

router.post("/accept-request", auth, acceptFriendRequest);
router.post("/reject-request", auth, rejectFriendRequest);

export default router