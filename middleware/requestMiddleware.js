const _db = require("../config/db");
const { ObjectId } = require("mongodb");

const isRequestRejected = async (req, res, next) => {
    let requestId = req.query.requestId;
    let db = _db.getDb();

    try {
        let result = await db.collection("requests").findOne(
            { _id: new ObjectId(requestId) },
            { projection: { _id: 0, status: 1 } }
        );

        if (result.status === "rejected") {
            res.json({
                isOk: false,
                msg: "This request is already rejected.",
            });
        } else {
            next();
        }
    } catch (err) {
        res.send(err);
    }
};

module.exports = {
    isRequestRejected,
};