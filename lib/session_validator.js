var db = require('../models/index.js')
  , User = db.User;


module.exports = function validate(sessionToken){
  User
    .find({where: {'sessionToken': sessionToken}})
    .success(function(user){
      if (!user){
        return false;
      } else {
        return true;
      }
    })
    .error(function(err){
      return false;
    });
}
