import dbConnect from "../database/dbConnect";


class Base {
    collectionName = "";
    static collectionName = "";

    constructor(collectionName) {
        // when call with new keyword extend classes...
        Base.collectionName = collectionName;
    }

    static databaseConnection;
    static client;

    static Db(collection) {
        return new Promise(async (resolve, reject) => {
            try {
                // use caching database client connection
                if (!Base.databaseConnection) {
                    let result = await dbConnect();
                    Base.databaseConnection = result.database
                    Base.client = result.client
                }
                resolve(Base.databaseConnection.collection(collection));
            } catch (ex) {
                reject(ex);
            }
        });
    }

    static getClient() {
        return new Promise(async (resolve, reject) => {
            try {
                // use caching database client connection
                if (!Base.databaseConnection) {
                    let result = await dbConnect();
                    Base.databaseConnection = result.database
                    Base.client = result.client
                }
                resolve(Base.client);
            } catch (ex) {
                reject(ex);
            }
        });
    }


// for initial database connection and create indexes
    static initialMongodbIndexes(COLLECTIONS) {
        return new Promise((async () => {
            try {
                await Base.getClient()


                COLLECTIONS.forEach((colItem) => {
                    let collection = Base.databaseConnection.collection(colItem.collectionName)
                    let indexes = colItem.indexes;
                    if (!indexes) return;

                    for (let indexesKey in indexes) {
                        collection.createIndex([indexesKey], indexes[indexesKey], function (error, result) {
                            console.log(error, result)
                            // if (a) {
                            //     console.log(a.message)
                            // } else {
                            //     console.log(`${colItem.name} collection indexed completed`)
                            // }
                        })
                    }
                })
            } catch (ex) {
                // console.log(ex.message)
            }
        }))

    }


    save() {
        return new Promise(async (resolve, reject) => {
            try {
                let {collectionName, ...other} = this
                let insertResult = await (await Base.Db(Base.collectionName)).insertOne(other)
                if (insertResult.insertedId) {
                    other._id = insertResult.insertedId
                    resolve(other)
                } else {
                    resolve(null)
                }
            } catch (ex) {
                reject(ex)
            }
        })
    }

    static get collection() {
        return Base.Db(this.collectionName)
    }

    static async insertOne(...params) {
        return (await Base.Db(this.collectionName)).insertOne(...params)
    }

    static async insertMany(...params) {
        return (await Base.Db(this.collectionName)).insertMany(...params);
    }

    static async find(...params) {
        return (await Base.Db(this.collectionName)).find(...params).toArray();
    }

    static async findOne(...params) {
        return (await Base.Db(this.collectionName)).findOne(...params)
    }

    static async deleteOne(filter) {
        return (await Base.Db(this.collectionName)).deleteOne(filter)
    }

    static async deleteMany(filter) {
        return (await Base.Db(this.collectionName)).deleteMany(filter)
    }

    static async updateOne(filter, updateData, opt = {}) {
        return (await Base.Db(this.collectionName)).updateOne(filter, updateData, opt)
    }

    static async aggregate(pipelines) {
        return (await Base.Db(this.collectionName)).aggregate(pipelines).toArray();
    }
}

export default Base;
