var net = require('net'),
    util = require('util'),
    csig = require('cookie-signature'),
    multiplex = require('multiplex'),
    config = require("./config.js");

function ProxyServer(){
  if (!(this instanceof ProxyServer)) return new ProxyServer();
  net.Server.call(this, {allowHalfOpen: false});
  
  this.on('connection', function (socket) {
    console.log("incoming");
    socket.once('data', function (d) {
      var _signed = d.toString(),
          token = csig.unsign(_signed, config.token_secret);
      if (!token || +token + config.token_timeout < Date.now()) return socket.destroy();
      console.log("valid client");
      
      var tunnel = multiplex({error:true}, function (stream, id) {
          var _parts = id.split(':'),
              port = _parts.pop(),
              host = _parts.join(':');
          
          console.log("connect", host, port);
          net.connect(port, host, function () {
              console.log("success");
              var socket = this;
              stream.pipe(socket).pipe(stream);
          });
      });
      socket.pipe(tunnel).pipe(socket);
    });
  });
}
util.inherits(ProxyServer, net.Server);

exports.ProxyServer = ProxyServer;
