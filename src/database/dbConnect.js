require("dotenv").config()

// const { MongoClient, ServerApiVersion  } = require('mongodb');

// const client = new MongoClient(process.env.DATABASE_URL, {
//     // serverApi: {
//     //     version: ServerApiVersion.v1,
//     //     strict: true,
//     //     deprecationErrors: true,
//     // }
// });
let database;


function dbConnect() {
    // return new Promise(async (resolve, reject) => {
    //     const clientPromise = client.connect();
    //     try {
    //         // we use mongodb client caching
    //         if(!database) {
    //             database = (await clientPromise).db("social-app");
    //         }
    //         resolve({database, client})
    //     } catch (ex){
    //         reject(ex)
    //     }
    // })
}


export default dbConnect