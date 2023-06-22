
import authRoute from "./authRoute";
import feedRoute from "./feedRoute";
import userRoute from "./userRoute";
import commentRoute from "./commentRoute";
import savedRoute from "./savedRoute";
import storyRoute from "./storyRoute";
import chatRoute from "./chatRoute";
import followRoute from "./followRoute";
import groupRoute from "src/routes/groupRoute";



const router = require("express").Router()

router.get("/", (req, res) => {
    res.send("Hello")
})

router.use("/api/v1/auth", authRoute)
router.use("/api/v1/feed", feedRoute)
router.use("/api/v1/users", userRoute)
router.use("/api/v1/comments", commentRoute)
router.use("/api/v1/saved", savedRoute)
router.use("/api/v1/story", storyRoute)
router.use("/api/v1/chat", chatRoute)
router.use("/api/v1/follow", followRoute)
router.use("/api/v1/groups", groupRoute)

export default router

