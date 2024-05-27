const jwt = require("../utils/jwt");
require("dotenv").config();

const isDriverLoggedIn = async (req, res, next) => {
  let access_token = req.cookies["accesstoken"];
  
  try {
    let decoded_jwt = jwt.decode(access_token, process.env.jwt_secret);
    req.driverId = decoded_jwt.id;
    req.role = decoded_jwt.role;
    next();
  } catch (err) {
    res.redirect("/driver");
  }
};

module.exports = {
  isDriverLoggedIn,
};