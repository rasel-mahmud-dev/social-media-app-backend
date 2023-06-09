
const { v2: cloudinary} = require("cloudinary");

require("dotenv").config()

const cloudinaryHandler = ()=>{
    cloudinary.config({
        cloud_name: process.env.CLOUD_NAME,
        api_key: process.env.API_KEY,
        api_secret: process.env.API_SECRET
    });

    return cloudinary
}

let a = {
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
}
console.log(a)



const imageUpload = (imagePath, dir)=>{
    return new Promise(async (resolve, reject)=>{
        try{
            let s = await cloudinaryHandler().uploader.upload(
                imagePath,
                {
                    use_filename: true,
                    unique_filename: false,
                    folder: dir ? dir : "",
                    overwrite: false
                })
            resolve(s)

        } catch (ex){
            console.log(ex)
            //  error: Error: getaddrinfo ENOTFOUND api.cloudinary.com
            resolve(null)
        }
    })

}



export default imageUpload