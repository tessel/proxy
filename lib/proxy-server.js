var net = require('net'),
    tls = require('tls'),
    util = require('util'),
    csig = require('cookie-signature'),
    multiplex = require('streamplex'),
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
      
      var tunnel = multiplex({error:true});
      socket.pipe(tunnel).pipe(socket);
      
      tunnel.on('stream', function (stream, type) {
        console.log("STREAM");
        stream.on('_pls_connect', function (port, host) {
          console.log("connect", host, port);
          // TODO: how to prevent unwanted (i.e. LAN/loopback) outbound?
          var net_lib = (type === 'tls') ? tls : net;
          net_lib.connect(port, host, function () {
              console.log("success");
              if (net_lib === tls) stream.remoteEmit('secureConnect');
              else stream.remoteEmit('connect');
              stream.pipe(this).pipe(stream);
          }).on('error', function (e) {
              stream.emit('error', e);
              //stream.destroy();
          });
        });
      });
    });
  });
}
util.inherits(ProxyServer, net.Server);

exports.ProxyServer = ProxyServer;
