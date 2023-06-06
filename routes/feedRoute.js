import {getFeeds, createFeed} from "../controllers/feedController";
import {auth} from "../middlewares"

const router = require("express").Router();

router.get("/", auth, getFeeds);
router.post("/create", auth, createFeed);


export default router