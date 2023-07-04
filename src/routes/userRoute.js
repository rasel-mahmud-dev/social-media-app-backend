import {auth} from "../middlewares"
import {
    acceptFriendRequest,
    addFriend,
    getFriends, getProfile,
    getUsers, rejectFriendRequest,
    removeFriend,
    getMedia
} from "../controllers/userController";

const router = require("express").Router();

router.get("/", auth, getUsers);

router.get("/media/:userId", auth, getMedia);
router.get("/profile/:userId", auth, getProfile);
router.get("/friends", auth, getFriends);
router.post("/add-friend", auth, addFriend);
router.post("/remove-friend", auth, removeFriend);

router.post("/accept-request", auth, acceptFriendRequest);
router.post("/reject-request", auth, rejectFriendRequest);

router.post("/reject-friend-request", auth, rejectFriendRequest);




export default router