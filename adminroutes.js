let express = require("express")
let router = express.Router();
let bcrypt = require("bcrypt");
let session = require("express-session");
const jwt = require("jsonwebtoken");
let _db = require("./config/db");
const { ObjectId, ReturnDocument } = require("mongodb");



router.use(session({
    secret: "This is session secret",
    resave: false,
    saveUninitialized: false
}));


let isRequestRejected = async (req, res, next) => {
    let requestId = req.query.requestId;
    let db = _db.getDb();


    try {
        let result = await db.collection("requests").findOne(
            { "_id": new ObjectId(requestId) },
            { projection: { "_id": 0, "status": 1 } }
        );


        if (result.status == "rejected") {
            res.json({
                isOk: false,
                msg: "This request is already rejected."
            })
        } else {
            next();
        }
    } catch (err) {
        res.send(err)
            ;
    }

}


let isAdminLoggedin = (req, res, next) => {

    if (req.session.isAdmin) {
        next();
    } else {
        res.redirect("/admin/login")
    }
}

router.get("/", (req, res) => {
    res.redirect("/admin/login");
})



router.get("/login", (req, res) => {
    // If the admin is already logged in then login page will redirect him to the dashboard page
    if (req.session.isAdmin) {
        res.redirect("/admin/dashboard");
    } else {
        res.render("admin/adminlogin.ejs");
    }
})



router.post("/login_process", (req, res) => {
    let { email, password } = req.body;

    let mail = "admin@example.com";
    let hashed_pass = "$2b$10$MmYRPyzFDEUjaEp1iYSdveyvR.v1n.jfoS6qSDQHx3GUEVWs4x8z6";     // Admin@123


    if (email == mail && bcrypt.compareSync(password, hashed_pass)) {
        req.session.isAdmin = true;
        res.redirect("/admin/dashboard");
    } else {
        res.send("Email or Password is wrong")
    }
})



router.get("/dashboard", isAdminLoggedin, async (req, res) => {
    let db = _db.getDb();

    let result = await db.collection("requests").find(
        {},
        {
            projection: {
                _id: false,
                request_type: true,
                status: true,
                assignedDriver: true,
            }
        }).toArray();

    let driverData = await db.collection("drivers").find(
        {},
        {
            projection: {
                _id: false,
                vehicleType: true,
            }
        }).toArray();

    let userData = await db.collection("users").find(
        {},
        {
            projection: {
                _id: false,
                name: true
            }
        }).toArray();



    const total_requests = result.length;
    const total_pending = result.filter((item) => item.status == "pending").length
    const total_resolved = result.filter((item) => item.status == "resolved").length
    const total_pickup_request = result.filter((item) => item.request_type == "Pickup").length
    const total_complaint_request = result.filter((item) => item.request_type == "Complaint").length
    const total_recycling_request = result.filter((item) => item.request_type == "Recycling").length
    const total_other_request = result.filter((item) => item.request_type == "Other").length
    const total_unassigned_driver_requests = result.filter((item) => item.assignedDriver == "none").length
    const total_users = userData.length;
    const total_drivers = driverData.length;
    const total_trucks = driverData.filter((item) => item.vehicleType == "Truck").length
    const total_cars = driverData.filter((item) => item.vehicleType == "Car").length
    const total_van = driverData.filter((item) => item.vehicleType == "Van").length
    const total_motorcycle = driverData.filter((item) => item.vehicleType == "Motorcycle").length



    res.render("admin/adminDashboard.ejs", {
        result: {
            total_requests: total_requests,
            total_pending: total_pending,
            total_resolved: total_resolved,
            total_pickup_request: total_pickup_request,
            total_complaint_request: total_complaint_request,
            total_recycling_request: total_recycling_request,
            total_other_request: total_other_request,
            total_unassigned_driver_requests: total_unassigned_driver_requests,
            total_drivers: total_drivers,
            total_users: total_users,
            total_trucks: total_trucks,
            total_cars: total_cars,
            total_van: total_van,
            total_motorcycle: total_motorcycle
        }
    });
})




router.get("/all-requests", async (req, res) => {
    let db = _db.getDb();

    let allDrivers = await db.collection("drivers").find({}).project({ "name": 1 }).toArray();

    db.collection("requests").find({}).toArray().then((result) => {

        res.render("admin/all-requests.ejs", { requests: result.reverse(), drivers: allDrivers });
    }).catch((err) => {
        console.log(err);
    });
})


router.get("/assign-driver", isRequestRejected, async (req, res) => {
    let { driverId, requestId } = req.query;
    let db = _db.getDb();

    try {

        // Get the driver name
        let driverName = await db.collection("drivers").find({ _id: new ObjectId(driverId) }).project({ _id: 0, name: 1 }).toArray();
        driverName = driverName[0].name;

        let data = await db.collection("requests").findOneAndUpdate(
            { _id: new ObjectId(requestId) },
            {
                $set: {
                    assignedDriver: driverName,
                    assignedDriverId: driverId
                }
            },
            { returnDocument: "after" }
        )

        if (data) {
            res.json({
                isOK: true,
                msg: "The driver has been assigned",
                driverName: data.assignedDriver
            });
        } else {
            res.json({
                isOK: false,
                msg: "Something went wrong."
            })
        }

    } catch (err) {
        res.send(err)
    }
})


router.get("/unassign-driver", isRequestRejected, async (req, res) => {
    let requestId = req.query.requestId;
    let db = _db.getDb();
    try {
        let result = await db.collection("requests").findOneAndUpdate(
            { _id: new ObjectId(requestId) },
            {
                $set: {
                    assignedDriver: "",
                    assignedDriverId: ""
                }
            },
            { returnDocument: "after" }
        )
        if (result.assignedDriver == "" && result.assignedDriverId == "") {
            res.json({
                isUnassinged: true,
                msg: "The driver has been unassigned succesfully."
            })
        } else {
            res.json({
                isUnassinged: false,
                msg: "Something went wrong."

            })
        }
    } catch (err) {
        res.send(err);
    }
})


router.get("/reject-request", isRequestRejected, async (req, res) => {
    let requestId = req.query.requestId;
    let db = _db.getDb();
    try {
        let result = await db.collection("requests").findOneAndUpdate(
            { _id: new ObjectId(requestId) },
            {
                $set: {
                    status: "rejected",
                    assignedDriver: "",
                    assignedDriverId: ""
                }
            },
            { returnDocument: "after" }
        )

        if (result.status === "rejected") {
            res.json({
                isRejected: true,
                msg: "The request has been rejected successfully"
            })
        } else {
            res.json({
                isRejected: false,
                msg: "Something went wrong."
            })
        }
    } catch (err) {
        res.send(err)
    }
})



router.get("/create-driver", isAdminLoggedin, (req, res) => {
    res.render("admin/create-driver.ejs")
})




router.post("/create-driver", isAdminLoggedin, async (req, res) => {
    let db = _db.getDb();
    let body = req.body;


    //let isEmail = await db.collection("drivers").findOne({ email: body.email })
    //let isPhone = await db.collection("drivers").findOne({ phone: body.phone });

    let isExistingUser = await db.collection("drivers").findOne({
        $or: [
            { email: body.email },
            { phone: body.phone }
        ]
    });


    if (isExistingUser) {
        res.send("Email or phone already registered");
    } else {

        if (body.password !== body.confirmPassword) {
            res.send("Passwords don't match");
        } else {
            body.password = bcrypt.hashSync(body.password, 10);
            delete body.confirmPassword;
            db.collection("drivers").insertOne(body).then((result) => {
                res.send("Driver Created")
            }).catch((err) => {
                res.send(err);
            })
        }
    }
})



router.get("/all-drivers", async (req, res) => {
    try {
        let db = _db.getDb();
        let result = await db.collection("drivers").find({}).project({ "password": 0 }).toArray();
        res.render("admin/allDrivers.ejs", { drivers: result })
    } catch (err) {
        res.send(err);
    }
})


router.get("/delete-driver", async (req, res) => {
    try{
    let driverId = req.query.driverId;
    let db = _db.getDb();
    let result = await db.collection("drivers").deleteOne({ _id: new ObjectId(driverId) });
    res.send("Driver deleted successfully")
    }catch(err){
        res.send("Something went wromg from server side")
    }
})


router.get("/logout", (req, res) => {
    req.session.isAdmin = false;
    res.redirect("/");
})



module.exports = router;