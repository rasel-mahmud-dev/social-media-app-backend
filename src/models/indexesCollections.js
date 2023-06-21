import Base from "./Base";

import User from "./User"
import Group from "./Group"
import Message from "./Message"
import Feed from "./Feed"
import Media from "./Media"
import Comment from "./Comment"
import Like from "./Like"
import Friend from "./Friend";
import Story from "./Story";
import Saved from "./Saved";
import Profile from "./Profile";

function indexesCollections(){
    Base.initialMongodbIndexes([
        User,
        Group,
        Message,
        Feed,
        Media,
        Comment,
        Like,
        Friend,
        Story,
        Saved,
        Profile
    ])
}
export default indexesCollections