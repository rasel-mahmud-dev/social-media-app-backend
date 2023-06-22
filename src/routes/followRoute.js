import {addFollow, followStatus, removeFollow} from "src/controllers/followController";
import {auth} from "../middlewares"

const router = require("express").Router();

router.post("/add", auth, addFollow);
router.post("/remove", auth, removeFollow);
router.get("/status", auth, followStatus);





export default router