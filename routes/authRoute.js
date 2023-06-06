import {createNewUser, login, verifyAuth} from "../controllers/authController";

const router = require("express").Router();

router.post("/registration", createNewUser);
router.post("/login", login);
router.get("/fetch-auth", verifyAuth);


export default router