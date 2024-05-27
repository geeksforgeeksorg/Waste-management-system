require("dotenv").config()

let mongo_client = require("mongodb").MongoClient;
let url = process.env.db_url;
let _db;

module.exports = {

    connectToServer: async function (callback) {
        try {
            let x = await mongo_client.connect(url);
            _db = x.db("waste_management_system");
            console.log("DB Connected");


            // Create a user table if there is no user table
            if((await _db.collections()).length == 0){
                _db.createCollection("users");
            }
           

        }catch(err){
            console.log(err);
        }
    },
    getDb: function () {
        return _db
    } 
};