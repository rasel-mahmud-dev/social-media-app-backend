import {
    addInvitePeople,
    createGroup,
    getGroupDetail,
    getMyGroups
} from "../controllers/groupController";


import {auth} from "../middlewares";


const router = require("express").Router();


router.get("/", auth, getMyGroups);
router.get("/:groupId", getGroupDetail);
router.post("/create", auth, createGroup);
router.post("/invitation", auth, addInvitePeople);


export default router
