
import Base from "./Base";

class Profile extends Base {
    static collectionName = "profile";

    // _id  => database uuid

    constructor({
                userId,
                gender,
                dateOfBrith,
            }) {
        super(Profile.collectionName);
        this.userId = userId
        this.gender = gender
        this.dateOfBrith = dateOfBrith

    }
}

export default Profile;
