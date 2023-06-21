import jwt from "jsonwebtoken";

export const createToken = (_id, email, role) => {
    return jwt.sign(
        {
            _id: _id,
            email: email,
            role: role,
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
