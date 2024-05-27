const isAdminLoggedIn = (req, res, next) => {
    if (req.session.isAdmin) {
      next();
    } else {
      res.redirect("/admin/login");
    }
  };
  
  module.exports = {
    isAdminLoggedIn,
  };