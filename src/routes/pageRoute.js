import {
    createPage,
    discoverPages,
    getPageDetail,
    getPagePosts,

    getMyPages
} from "../controllers/pageController";


import {auth} from "../middlewares";

const router = require("express").Router();


router.get("/discover", auth, discoverPages);
router.get("/posts/:pageName", auth, getPagePosts);
router.get("/my-pages", auth, getMyPages);
router.post("/create", auth, createPage);
router.get("/:pageName", auth, getPageDetail);



export default router
