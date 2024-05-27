const jwt = require("../utils/jwt");

const authMiddleware = (req, res, next) => {
  const token = req.cookies["accesstoken"];

  try {
    jwt.verify(token, "secret", (err, mail) => {
      if (err) {
        console.log(err);
        res.status(403).json("You are not logged in :(");
      } else {
        next();
      }
    });
  } catch (err) {
    res.status(403).json("This is an error");
  }
};

module.exports = authMiddleware;