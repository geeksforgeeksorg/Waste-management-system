const _db = require("../config/db");
const bcrypt = require("../utils/bcrypt");
const jwt = require("../utils/jwt");
const { ObjectId } = require("mongodb");
require("dotenv").config()

exports.getDriverLogin = async (req, res) => {
  try {
    let access_token = req.cookies["accesstoken"];
    let decoded_jwt = await jwt.verify(access_token, process.env.jwt_secret);

    if (decoded_jwt.role === "driver" && decoded_jwt.id) {
      res.redirect("/driver/dashboard");
    }
  } catch (err) {
    res.render("driver/driverLogin.ejs");
  }
};

exports.loginDriver = async (req, res) => {
  let { email, password } = req.body;
  let db = _db.getDb();
  let result = await db.collection("drivers").findOne({ email });

  if (!result) {
    res.send("Wrong email or password");
  } else {
    let password_in_db = result.password;
    let isPasswordOk = bcrypt.comparePassword(password, password_in_db);

    if (isPasswordOk) {
      let access_token = jwt.sign({ id: result._id, role: "driver" }, process.env.jwt_secret);
      res.cookie("accesstoken", access_token);
      res.redirect("/driver/dashboard");
    } else {
      res.send("Wrong email or password");
    }
  }
};


exports.getDriverDashboard = async (req, res) => {
  try {
    let db = _db.getDb();
    
    let result = await db
      .collection("requests")
      .find(
        {
          assignedDriverId: `${req.driverId}`,
        },
        {
          projection: {
            _id: false,
            name: false,
            address: false,
            assignedDriver: false,
          },
        }
      )
      .toArray();

    let total_pending = result.filter((item) => item.status === "pending").length;
    let total_resolved = result.filter((item) => item.status === "resolved").length;
    let total_rejected = result.filter((item) => item.status === "rejected").length;
    let total_pickup_request = result.filter((item) => item.request_type === "Pickup").length;
    let total_complaint_request = result.filter((item) => item.request_type === "Complaint").length;
    let total_recycling_request = result.filter((item) => item.request_type === "Recycling").length;
    let total_other_request = result.filter((item) => item.request_type === "Other").length;

    res.render("driver/driverDashboard.ejs", {
      result: {
        total_requests: result.length,
        total_pending,
        total_resolved,
        total_rejected,
        total_pickup_request,
        total_complaint_request,
        total_recycling_request,
        total_other_request,
      },
    });
  } catch (err) {
    res.send(err);
  }
};

exports.getPendingRequests = async (req, res) => {
  let db = _db.getDb();
  let result = await db
    .collection("requests")
    .find({ assignedDriverId: req.driverId, status: "pending" })
    .project({
      status: 0,
      assignedDriver: 0,
      assignedDriverId: 0,
    })
    .toArray();

  res.render("driver/pendingRequests.ejs", { requests: result });
};

exports.resolveRequest = async (req, res) => {
  let requestId = req.query.requestId;
  let db = _db.getDb();

  let result = await db.collection("requests").findOneAndUpdate(
    {
      _id: new ObjectId(requestId),
      assignedDriverId: req.driverId,
    },
    { $set: { status: "resolved" } }
  );

  res.json(result);
};

exports.rejectRequest = async (req, res) => {
  let requestId = req.query.requestId;
  let db = _db.getDb();

  let result = await db.collection("requests").findOneAndUpdate(
    {
      _id: new ObjectId(requestId),
      assignedDriverId: req.driverId,
    },
    { $set: { status: "rejected" } }
  );

  res.json(result);
};

exports.getRequestHistory = async (req, res) => {
  try {
    let db = _db.getDb();
    let result = await db
      .collection("requests")
      .find({ assignedDriverId: req.driverId }, { projection: { _id: false } })
      .toArray();
    res.render("driver/history.ejs", { requests: result.reverse() });
  } catch (err) {
    res.send(err);
  }
};

exports.logoutDriver = (req, res) => {
  res.clearCookie("accesstoken");
  res.redirect("/driver");
};