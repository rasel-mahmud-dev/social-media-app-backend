import {getNotifications} from "../controllers/notificationController";


import {auth} from "../middlewares";


const router = require("express").Router();


router.get("/all", auth, getNotifications);


export default router
