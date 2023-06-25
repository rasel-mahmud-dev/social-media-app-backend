import {
    acceptInvitation,
    addInvitePeople,
    createGroup,
    discoverGroups,
    getGroupDetail,
    getGroupFeeds,
    getMyGroups
} from "../controllers/groupController";


import {auth} from "../middlewares";


const router = require("express").Router();


router.get("/", auth, getMyGroups);
router.get("/discover", auth, discoverGroups);
router.get("/feeds", auth, getGroupFeeds);
router.get("/:groupSlug", getGroupDetail);
router.post("/create", auth, createGroup);
router.post("/invitation", auth, addInvitePeople);
router.post("/invitation-accepted", auth, acceptInvitation);



export default router
