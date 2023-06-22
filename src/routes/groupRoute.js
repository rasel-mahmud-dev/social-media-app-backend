import {
     createGroup
} from "../controllers/groupController";


import {auth} from "../middlewares";


const router = require("express").Router();

// router.get("/",  auth, getMessages);


router.post("/create",  auth, createGroup);



export default router
