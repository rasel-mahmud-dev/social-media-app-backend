import {auth} from "../middlewares"
import {addFriend, getFriends, getUsers, removeFriend} from "../controllers/userController";

const router = require("express").Router();

router.get("/", auth, getUsers);
router.get("/friends", auth, getFriends);
router.post("/add-friend", auth, addFriend);
router.post("/remove-friend", auth, removeFriend);


export default router