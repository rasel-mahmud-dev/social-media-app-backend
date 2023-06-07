import {ObjectId} from "mongodb";
import User from "../models/User";
import Base from "../models/Base";
import Friend from "../models/Friend";


export const getUsers = async (req, res, next) => {
    try {
        let authUser = await User.findOne({_id: new ObjectId(req.user._id)})

        if (!authUser) return next("Internal error")

        let authUserFriends = []

        if (authUser && authUser["friends"]) {
            authUserFriends = authUser["friends"].map(id => new ObjectId(id)) || []
        }

        let users = await User.aggregate([
            {
                $match: {
                    _id: {
                        $nin: [new ObjectId(req.user._id), ...authUserFriends]
                    }
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "author"
                }
            },
            {
                $project: {
                    password: 0,
                    role: 0,
                    createdAt: 0,
                    updatedAt: 0,
                    email: 0,
                }
            }
        ])
        res.status(200).json(users);
    } catch (ex) {
        next(ex);
    }
}


export const getFriends = async (req, res, next) => {
    try {

        // get all friend request
        let allFriends = await Friend.aggregate([
            {
                $match: {
                    receiverId: new ObjectId(req.user._id)
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "senderId",
                    foreignField: "_id",
                    as: "friend"
                }
            },
            {
                $unwind: {path: "$friend"}
            },
            {
                $replaceRoot: {
                    newRoot: {
                        $mergeObjects: [
                            "$friend",
                            {
                                _id: "$_id",
                                receiverId: "$receiverId",
                                senderId: "$senderId",
                                createdAt: "$createdAt",
                                status: "$status"
                            }
                        ]
                    }
                }
            },
            {
                $project: {
                    password: 0,
                    role: 0,
                    friends: 0,
                    createdAt: 0,
                    updatedAt: 0,
                    email: 0,
                }
            }
        ])

        let pendingFriends = allFriends.filter(friend => friend.status === "pending")
        let friends = allFriends.filter(friend => friend.status === "accepted")

        res.status(200).json({friends: friends, pendingFriends});
    } catch (ex) {
        next(ex);
    }
}


export const addFriend = async (req, res, next) => {

    try {
        const {friendId} = req.body

        let friendRequest = await Friend.updateOne({
            receiverId: new ObjectId(req.user._id),
            senderId: new ObjectId(friendId)
        }, {
            $set: {
                receiverId: new ObjectId(req.user._id),
                senderId: new ObjectId(friendId),
                status: "pending",
                createdAt: new Date()
            }

        }, {
            upsert: true,
            new: true
        })

        console.log(friendRequest)

        // client = await Base.getClient()
        //
        // // Start a session
        // session = client.startSession();
        // //
        // await session.withTransaction(async () => {
        //     // Add your transactional operations here
        //
        //     // Operation 1: Update document
        //     const collection = client.db("social-app").collection('users');
        //
        //     await collection.updateOne({_id: new ObjectId(req.user._id),},
        //         {$addToSet: { friends: new ObjectId(friendId) },},
        //         // {session } // local mongo not support transaction
        //     );
        //
        //     // Operation 2: Delete document
        //     await collection.updateOne({_id: new ObjectId(friendId),},
        //         {$addToSet: { friends: new ObjectId(req.user._id) },},
        //         // {session} // local mongo not support transaction
        //     );
        //
        //     // Add more operations as needed
        //     console.log('Transaction completed successfully');
        // });
        //
        // console.log('Transaction completed successfully');

    } catch (error) {
        console.error(error);


    } finally {

    }
}


export const removeFriend = async (req, res, next) => {
    let session;
    let client

    try {
        const {friendId} = req.body

        client = await Base.getClient()

        // Start a session
        session = client.startSession();
        //
        await session.withTransaction(async () => {
            // Add your transactional operations here

            // Operation 1: Update document
            const collection = client.db("social-app").collection('users');

            await collection.updateOne({_id: new ObjectId(req.user._id),},
                {$pull: {friends: new ObjectId(friendId)},},
                // {session } // local mongo not support transaction
            );

            // Operation 2: Delete document
            await collection.updateOne({_id: new ObjectId(friendId),},
                {$pull: {friends: new ObjectId(req.user._id)},},
                // {session} // local mongo not support transaction
            );

            // Add more operations as needed
            console.log('Transaction completed successfully');
        });

        console.log('Transaction completed successfully');

    } catch (error) {
        console.error('Transaction aborted:', error);


    } finally {
        // End the session
        session.endSession();
    }

}



export const acceptFriendRequest = async (req, res, next) => {

    try {
        const {senderId} = req.body

        let result = await Friend.updateOne({
            receiverId: new ObjectId(req.user._id),
            senderId: new ObjectId(senderId)
        }, {
            $set: {
                status: "accepted"
            }
        })

        console.log(result)

    } catch (error) {
        next(error);
    }
}


export const rejectFriendRequest = async (req, res, next) => {
    try {
        const {senderId} = req.body

        let result = await Friend.deleteOne({
            receiverId: new ObjectId(req.user._id),
            senderId: new ObjectId(senderId)
        })
        console.log(result)
    } catch (error) {
        next(error);
    }
}
