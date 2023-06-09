import Base from "./Base";

class User extends Base {
    static collectionName = "users";

    // _id  => database uuid

    static indexes = {
        googleId: {},
        email: {},
        role: {},
    }

    constructor({
                    firstName,
                    lastName,
                    googleId = null,
                    role = "USER",
                    email,
                    fullName,
                    password,
                    avatar = "",
                    cover = ""

                }) {
        super("users");
        this.role = role
        this.avatar = avatar
        this.cover = cover
        this.firstName = firstName;
        this.lastName = lastName;
        this.fullName = fullName;
        this.googleId = googleId;
        this.email = email;
        this.password = password;
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }
}

export default User;
