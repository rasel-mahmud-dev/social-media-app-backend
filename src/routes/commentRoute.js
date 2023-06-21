import {getComments, createComment, deleteComment} from "../controllers/commentController";
import {auth} from "../middlewares"

const router = require("express").Router();

router.get("/:feedId", auth, getComments);
router.post("/create", auth, createComment);
router.delete("/:feedId", auth, deleteComment);



export default router