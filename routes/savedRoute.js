import {createSaved, getSaved} from "../controllers/savedController";
import {auth} from "../middlewares"

const router = require("express").Router();

router.get("/", auth, getSaved);
router.post("/", auth, createSaved);



export default router