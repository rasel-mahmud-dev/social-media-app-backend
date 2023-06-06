

const { v2: cloudinary} = require("cloudinary");


export const cloudinaryHandler = ()=>{
    cloudinary.config({
        cloud_name: process.env.CLOUD_NAME,
        api_key: process.env.API_KEY,
        api_secret: process.env.API_SECRET
    });

    return cloudinary
}



export const imageUpload = (imagePath, dir)=>{
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

            if(ex.message){
                if(typeof ex.message === "string"){

                }
            }
            if(ex.error){
                if(typeof ex.error === "string"){

                } else {

                }
            }
            resolve(null)
        }
    })

}


export default imageUpload