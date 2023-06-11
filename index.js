import express from "express"
import cors from "cors";
import morgan from "morgan"
require("dotenv").config()

import routes  from "./routes"
import indexesCollections from "./models/indexesCollections";



const port = process.env.PORT || 1000;


const app = express()

const whitelist = [process.env.FRONTEND]
    const corsOptions = {
        credentials: true,
        origin: function (origin, callback) {

    if(whitelist.indexOf(origin) !== -1) {
      callback(null, true)

    } else {
      // no access
      // callback(null, false)
      callback(null, true)
    }
  }
}

app.use(cors(corsOptions))
app.use(morgan("dev"))
app.use(express.json())
app.use("/public/", express.static("public"))
app.use("/static/", express.static("static"))


app.use(routes)

// Capture 500 errors
app.use((err, req, res, next)=>{
    let message = "Internal error, Please try again"
    let status = 500

    if(err && err.message){
        message = err.message
    }

    if(err && typeof err === "string"){
        message = err
    }

    if(err && err.status){
        status = err.status
    }
    res.status(status).json({message: message})
})

// Capture 404 errors
app.use((req,res,next) => {
  res.status(404).send("PAGE NOT FOUND");
})


app.listen(port, "0.0.0.0", ()=>{
  console.log(`Server started and running on http://localhost:${port}`)


    // indexes mongodb
    indexesCollections()

})
