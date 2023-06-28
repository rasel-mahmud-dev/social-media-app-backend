import {
    createPage,
    discoverPages,
    getPageDetail,

    getMyPages
} from "../controllers/pageController";


import {auth} from "../middlewares";

const router = require("express").Router();


router.get("/my-pages", auth, getMyPages);
router.get("/discover", auth, discoverPages);
router.get("/:pageSlug", auth, getPageDetail);
router.post("/create", auth, createPage);



export default router
