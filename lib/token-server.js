var tls = require('net'),       // TODO: provide tls certificate (or convert to http and let nginx secure…)
    util = require('util'),
    csig = require('cookie-signature'),
    config = require("./config.js"),
    qs = require('querystring'),
    http = require('http');

function checkCredentials(creds, cb) {
  setImmediate(function () {
    var params = qs.stringify({
      proxySecret: process.env.PROXY_SECRET,
      proxyKey: creds
    });
    http.get({
      hostname: process.env.PROXY_HOST,
      port: process.env.PROXY_PORT,
      path: '/proxy/verify?'+params
    }, function(res){
      res.on('data', function(d){
        if(!d.toJSON().error){
          cb(null, true);
        } else {
          cb(d.toJSON().error, false);
        }
      })
    });
  });
}


function TokenServer(){
  if (!(this instanceof TokenServer)) return new TokenServer();
  tls.Server.call(this, {allowHalfOpen: false});
  
  this.on('connection', function (socket) {
    console.log("token request");
    function bail() {
        socket.destroy();
        socket = null;
    }
    socket.on('error', bail);
    socket.once('data', function (d) {
      var creds = d.toString().trim();
      checkCredentials(creds, function (e, valid) {
        if (e) console.warn(e.stack);
        if (e || !valid) return bail();
        
        var token = Date.now().toString(),
            _signed = csig.sign(token, config.token_secret);
        socket.end(_signed);
      });
    });
  });
}
util.inherits(TokenServer, tls.Server);

exports.TokenServer = TokenServer;
