
import authRoute from "./authRoute";
import feedRoute from "./feedRoute";


const router = require("express").Router()

router.get("/", (req, res) => {
    res.send("Hello")
})

router.use("/api/v1/auth", authRoute)
router.use("/api/v1/feed", feedRoute)


export default router