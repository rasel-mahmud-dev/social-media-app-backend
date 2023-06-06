import jwt from "jsonwebtoken";

export const createToken = (user_id, email, roles) => {
    return jwt.sign(
        {
            user_id: user_id,
            email: email,
            roles: roles,
        },
        process.env.SECRET,
        { expiresIn: "7d" }
    );
};

export const parseToken = (token) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (token) {
                let d = await jwt.verify(token, process.env.SECRET);
                resolve(d);
            } else {
                reject(new Error("Token not found"));
            }
        } catch (ex) {
            reject(ex);
        }
    });
};
