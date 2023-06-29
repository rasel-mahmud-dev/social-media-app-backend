import {
    createPage,
    discoverPages,
    getPageDetail,
    getPagePosts,
    togglePageLike,
    getMyPages, getPageLikes
} from "../controllers/pageController";


import {auth} from "../middlewares";

const router = require("express").Router();


router.get("/discover", auth, discoverPages);
router.get("/posts/:pageName", auth, getPagePosts);
router.get("/my-pages", auth, getMyPages);
router.post("/create", auth, createPage);
router.post("/toggle-like", auth, togglePageLike);
router.get("/likes", auth, getPageLikes);
router.get("/:pageName", auth, getPageDetail);



export default router
