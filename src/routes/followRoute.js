import { addFollow } from "../controllers/followController";
import {auth} from "../middlewares"

const router = require("express").Router();

router.post("/add", auth, addFollow);





export default router