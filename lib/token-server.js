var tls = require('net'),       // TODO: provide tls certificate (or convert to http and let nginx secure…)
    util = require('util'),
    csig = require('cookie-signature'),
    config = require("./config.js");

function checkCredentials(creds, cb) {
  // TODO: verify with auth server (i.e. do credentials merit a proxy token?)
  setImmediate(function () {
      if (creds === 'DEV-CRED') cb((Math.random() > 0.9) ? new Error("Chaos monkeyed!") : null, true);
      else cb(null, false);
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
