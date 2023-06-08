
import authRoute from "./authRoute";
import feedRoute from "./feedRoute";
import userRoute from "./userRoute";
import commentRoute from "./commentRoute";
import savedRoute from "./savedRoute";


const router = require("express").Router()

router.get("/", (req, res) => {
    res.send("Hello")
})

router.use("/api/v1/auth", authRoute)
router.use("/api/v1/feed", feedRoute)
router.use("/api/v1/users", userRoute)
router.use("/api/v1/comments", commentRoute)
router.use("/api/v1/saved", savedRoute)


export default router