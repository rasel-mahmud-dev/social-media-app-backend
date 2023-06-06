import {createNewUser, login} from "../controllers/authController";

const router = require("express").Router();

router.post("/registration", createNewUser);
router.post("/login", login);


export default router