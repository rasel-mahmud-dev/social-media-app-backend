import {createNewUser} from "../controllers/authController";

const router = require("express").Router();

router.post("/registration", createNewUser);


export default router