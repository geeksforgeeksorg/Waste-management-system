let express = require("express");
const _db = require("./config/db");
let router = express.Router();
let bcrypt = require("bcrypt")
let jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");



let isDriverLoggedIn = async (req, res, next) => {
    let access_token = req.cookies["accesstoken"];

    try {
        let decoded_jwt = await jwt.verify(access_token, "secret");
        req.driverId = decoded_jwt.id;
        req.role = decoded_jwt.role;
        next();
    }
    catch (err) {
        res.redirect("/driver")
    }
}

router.get("/", async (req, res) => {
    // Check if driver already loggedin
    try {
        let access_token = req.cookies["accesstoken"];
        let decoded_jwt = await jwt.verify(access_token, "secret");

        if (decoded_jwt.role == "driver" && decoded_jwt.id) {
            res.redirect("/driver/dashboard")
        }
    } catch (err) {
        res.render("driver/driverLogin.ejs")
    }
})


router.post("/login_process", async (req, res) => {
    let { email, password } = req.body;
    let db = _db.getDb();
    let result = await db.collection("drivers").findOne({ email: email });
    if (result == null) {
        res.send("Wrong email or password -")
    } else {
        let password_in_db = result.password;
        let isPasswordOk = bcrypt.compareSync(password, password_in_db);
        if (isPasswordOk) {
            let access_token = jwt.sign({ id: result._id, role: "driver" }, "secret");
            res.cookie("accesstoken", access_token);
            res.redirect("/driver/dashboard")
        } else {
            res.send("Wrong email or password");
        }
    }
})


router.get("/dashboard", isDriverLoggedIn, async (req, res) => {
    try{
    let db = _db.getDb();

    let result = await db.collection("requests").find({
        assignedDriverId: `${req.driverId}`
    }, {
        projection: {
            _id: false,
            name: false,
            address: false,
            assignedDriver: false
        }
    }).toArray();

    let total_pending = result.filter((item) => item.status == "pending").length
    let total_resolved = result.filter((item) => item.status == "resolved").length
    let total_rejected = result.filter((item) => item.status == "rejected").length
    let total_pickup_request = result.filter((item) => item.request_type == "Pickup").length
    let total_complaint_request = result.filter((item) => item.request_type == "Complaint").length
    let total_recycling_request = result.filter((item) => item.request_type == "Recycling").length
    let total_other_request = result.filter((item) => item.request_type == "Other").length

    res.render("driver/driverDashboard.ejs", {result: {
        total_requests: result.length,
        total_pending: total_pending,
        total_resolved: total_resolved,
        total_rejected: total_rejected,
        total_pickup_request: total_pickup_request,
        total_complaint_request: total_complaint_request,
        total_recycling_request: total_recycling_request,
        total_other_request: total_other_request
    }})
    }catch(err){
        res.send(err);
    }
})


router.get("/pending-requests", isDriverLoggedIn, async (req, res) => {
    let db = _db.getDb();
    let result = await db.collection("requests").find({ assignedDriverId: req.driverId, status: "pending" }).project({
        status: 0,
        assignedDriver: 0,
        assignedDriverId: 0
    }).toArray();

    res.render("driver/pendingRequests.ejs", { requests: result })
})


router.get("/resolve-request", isDriverLoggedIn, async (req, res) => {
    let requestId = req.query.requestId;
    let db = _db.getDb();

    // First check if the drived logged-in currently is sending the resolve request
    let result = await db.collection("requests").findOneAndUpdate(
        {
            _id: new ObjectId(requestId),
            assignedDriverId: req.driverId
        },
        {$set: {
            status: "resolved"
        }}
    )

    res.json(result)
})


router.get("/reject-request", isDriverLoggedIn, async (req, res) => {
    let requestId = req.query.requestId;
    let db = _db.getDb();

    // First check if the drived logged-in currently is sending the resolve request
    let result = await db.collection("requests").findOneAndUpdate(
        {
            _id: new ObjectId(requestId),
            assignedDriverId: req.driverId
        },
        {$set: {
            status: "rejected"
        }}
    )

    res.json(result)
})


router.get("/history", isDriverLoggedIn, async (req, res) => {
    try{
        let db = _db.getDb();

        let result = await db.collection("requests").find({assignedDriverId: req.driverId}, { projection: { _id: false } }).toArray();
        res.render("driver/history.ejs", {
            requests: result.reverse()
        })
    }catch(err){
        res.send(err);
    }
}) 

router.get("/logout", (req, res) => {
    res.cookie("accesstoken", "");
    res.redirect("/driver")
})

 




module.exports = router;
