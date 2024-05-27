const express = require("express")
const app = express();
const path = require("path")
const ejs = require("ejs");
const _db = require("./config/db");
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const cookieparser = require("cookie-parser");
let adminRoutes = require("./adminroutes");
let driverRoutes = require("./driverRoutes");



app.use(express.json())
app.use(express.urlencoded({ extended: true }));
_db.connectToServer();
app.set("view engine", ejs);
app.set("views", path.join(__dirname, "public/views"))
app.use(express.static(path.join(__dirname, "public/")));
app.use(cookieparser());


app.use("/admin", adminRoutes);
app.use("/driver", driverRoutes)


let user_verification = (req, res, next) => {
    let token = req.cookies["accesstoken"];
    try {
        jwt.verify(token, "secret", (err, mail) => {
            if (err) {
                console.log(err);
                res.status(403).json("You are not logged in :(");
            }
            else {
                next();
            }
        });
    } catch (err) {
        res.status(403).json("This is an error")
    }
}


app.get("/", (req, res) => {

    let token = req.cookies["accesstoken"];
    jwt.verify(token, "secret", (err, user) => {
        if (err) {
            // This is rendering the landing page of project
            res.render("user/homepage.ejs")
        } else {
            res.redirect("/home");
        }
    })
})


app.get("/signup", (req, res) => {
    res.render("user/signup.ejs")
})

app.get("/login", (req, res) => {
    res.render("user/login.ejs")
})




app.post("/signup_process", async (req, res) => {
    let entered_data = req.body;
    let db = _db.getDb();
    let { number, password, email } = entered_data;

    entered_data.password = bcrypt.hashSync(password, 10);

    // Add the timestamp to the data
    entered_data.time_stamp = new Date().toGMTString();


    let number_in_db = await db.collection("users").findOne({ "number": number });
    let mail_in_db = await db.collection("users").findOne({ "number": email });

    if (number_in_db || mail_in_db) {
        res.send("Number or Email already exists.");
    } else {
        try {
            db.collection("users").insertOne(entered_data);
            res.send("You are signed Up Now <a href='/login'>Login Here</a>")
        } catch (err) {
            console.log(err);
        }
    }
})


app.post("/login_process", async (req, res) => {
    let body = req.body;
    let { email, password } = body;
    let db = _db.getDb();


    // Check if the user is present in the DB or not
    let data_in_db = await db.collection("users").findOne({ email: email });

    if (!data_in_db) {
        res.send("Email or password is wrong");
    } else {

        // Check the password in DB and match with the provided passowrd
        let password_in_db = data_in_db.password;
        let is_password_right = bcrypt.compareSync(password, password_in_db);

        if (!is_password_right) {
            res.send("Email or password is wrong")
        } else {
            let access_token = jwt.sign({ "mail": email }, "secret", { expiresIn: "5h" });
            res.cookie("accesstoken", access_token);
            console.log("user Logged in");
            res.redirect("/home");
        }
    }
})


app.get("/home", user_verification, async (req, res) => {
    let token = req.cookies["accesstoken"];
    let email = jwt.decode(token, "secret")["mail"];
    let db = _db.getDb();

    let result = await db.collection("requests").find(
        {
            email: email
        },
        {
            projection: {
                _id: false,
                request_type: true,
                status: true,
                assignedDriver: true,
            }
        }).toArray();

    let total_requests = result.length;
    let total_pending = result.filter((item) => item.status == "pending").length
    let total_resolved = result.filter((item) => item.status == "resolved").length
    let total_pickup_request = result.filter((item) => item.request_type == "Pickup").length
    let total_complaint_request = result.filter((item) => item.request_type == "Complaint").length
    let total_recycling_request = result.filter((item) => item.request_type == "Recycling").length
    let total_other_request = result.filter((item) => item.request_type == "Other").length
    let total_unassigned_driver_requests = result.filter((item) => item.assignedDriver == "none").length


    res.render("user/userDashboard.ejs", {
        result: {
            total_requests: total_requests,
            total_pending: total_pending,
            total_resolved: total_resolved,
            total_pickup_request: total_pickup_request,
            total_complaint_request: total_complaint_request,
            total_recycling_request: total_recycling_request,
            total_other_request: total_other_request,
            total_unassigned_driver_requests: total_unassigned_driver_requests
        }
    });
})


app.get("/logout", (req, res) => {
    let token = req.cookies["accesstoken"];
    res.cookie("accesstoken", "");
    res.redirect("/");
})


app.get("/raise-a-request", user_verification, (req, res) => {
    res.render("user/request.ejs")
})


app.post("/submit_request", user_verification, (req, res) => {
    let token = req.cookies["accesstoken"]
    let mail = jwt.decode(token, "secret")["mail"];
    let data_to_insert_in_db = req.body;
    data_to_insert_in_db.email = mail;
    data_to_insert_in_db.status = "pending";
    data_to_insert_in_db.time = new Date().toLocaleString();
    data_to_insert_in_db.assignedDriver = "none"

    let db = _db.getDb();
    db.collection("requests").insertOne(data_to_insert_in_db).then((result) => {
        res.send("Your request has been submitted to our database.")
    }).catch((err) => {
        res.send("There is some error here")
    });
})


app.get("/my-requests", user_verification, async (req, res) => {
    let email = jwt.decode(req.cookies["accesstoken"], "secret")["mail"];
    let db = _db.getDb();


    try {
        let result = await db.collection("requests").find({ email: email }).toArray();
        res.render("user/my-requests.ejs", { requests: result.reverse() });
    }
    catch (err) {
        res.send("There is some error.")
    }
})


app.get("*", (req, res) => {
    res.render("404.ejs");
})


app.listen("3000", () => {
    console.log("Application is running successfully");
})