import {getReels, createReel} from "../controllers/reelsController";
import {auth} from "../middlewares"

const router = require("express").Router();

router.get("/", auth, getReels);
router.post("/create", auth, createReel);



export default router