
import app from "src/app/app"


const port = process.env.PORT || 1000;

app.listen(port, "0.0.0.0", ()=>{
    console.log(`Server started and running on http://localhost:${port}`)


    // indexes mongodb
    // indexesCollections()

})
