
import app from "src/app/app"
import indexesCollections from "src/models/indexesCollections";


const port = process.env.PORT || 1000;

app.listen(port, "0.0.0.0", ()=>{


    // indexes mongodb
    // indexesCollections()


    console.log(`Server started and running on http://localhost:${port}`)



})
