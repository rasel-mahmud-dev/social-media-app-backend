import {getFeeds, createFeed, toggleLike, deleteFeed, getFeed} from "../controllers/feedController";
import {auth} from "../middlewares"

const router = require("express").Router();

router.get("/", auth, getFeeds);
router.get("/:feedId", auth, getFeed);
router.post("/create", auth, createFeed);
router.post("/toggle-like", auth, toggleLike);
router.delete("/:feedId", auth, deleteFeed);


export default router