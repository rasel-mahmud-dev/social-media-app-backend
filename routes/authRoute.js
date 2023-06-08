import {createNewUser, login, updateProfile, verifyAuth} from "../controllers/authController";
import {auth} from "../middlewares";

const router = require("express").Router();

router.post("/registration", createNewUser);
router.post("/login", login);
router.get("/fetch-auth", verifyAuth);
router.post("/update-profile", auth, updateProfile);


export default router