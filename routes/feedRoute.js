import {getFeeds, createFeed, toggleLike} from "../controllers/feedController";
import {auth} from "../middlewares"

const router = require("express").Router();

router.get("/", auth, getFeeds);
router.post("/create", auth, createFeed);
router.post("/toggle-like", auth, toggleLike);


export default router