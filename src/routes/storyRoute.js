import {getStories, createStory} from "../controllers/storyController";
import {auth} from "../middlewares"

const router = require("express").Router();

router.get("/", auth, getStories);
router.post("/", auth, createStory);



export default router