var fs = require('fs'),
    net = require('net'),
    tls = require('tls'),
    streamplex = require('streamplex');

var auth = require("./proxy-auth.js"),
    PORT = +process.env.PORT || 0,
    CERT_FILE = process.env.CERT_FILE || "config/public-cert.pem",
    KEY_FILE = process.env.KEY_FILE || "config/private-key.pem",
    KEY_PASS = process.env.KEY_PASS;

var srvId = 'proc:'+process.pid;

tls.createServer({
  key: fs.readFileSync(KEY_FILE),
  passphrase: KEY_PASS,
  cert: fs.readFileSync(CERT_FILE)
}, function (tunnelSocket) {
//net.createServer(function (tunnelSocket) {
  var logId = 'tunnel:'+Math.random().toFixed(20).slice(2);   // just a greppable string
  console.log(srvId, logId, "incoming tunnel from", tunnelSocket.remoteAddress);
  
  var tunnel = streamplex(streamplex.A_SIDE),
      authed = false;
  tunnelSocket.pipe(tunnel).pipe(tunnelSocket);
  tunnelSocket.on('error', function (e) {
    console.warn(srvId, logId, "tunnel network error", e.stack);
    tunnel.destroy(e);
  });
  tunnelSocket.on('close', function () {
    console.log(srvId, logId, "tunnel closed");
    tunnel.destroy();
  });
  tunnel.on('error', function (e) {
    console.warn(srvId, logId, "tunnel parsing error", e.stack);
    tunnel.destroy(e);
  });
  tunnel.on('message', function (d) {
    auth(d.token, function (e, userId) {
      if (e) console.error(srvId, logId, "auth system error", e.stack);
      else if (userId) authed = true;
      tunnel.sendMessage({authed:authed});
      if (authed) console.log(srvId, logId, "authenticated as:", userId);
      else if (!e) console.warn(srvId, logId, "auth failed!");
    });
  });
  tunnel.on('stream', function (stream, type) {
    if (!authed) {
      console.warn(srvId, logId, "unauthorized stream request!");
      tunnel.sendMessage({error:"Not authorized!"});
      return tunnelSocket.destroy();
    }
    var logSubId = 'stream:'+Math.random().toFixed(5).slice(2);
    console.info(srvId, logId, logSubId, "creating socket");
    
    var socket = new net.Socket();
    stream.on('_pls_connect', function (port, host) {
      console.log(srvId, logId, logSubId, "connection request:", host, port, type);
      // TODO: how to prevent unwanted (i.e. LAN/loopback) outbound?
      socket.connect(port, host, function () {
        console.info(srvId, logId, logSubId, "connection success");
        stream.remoteEmit('connect');
        if (type === 'tls') tls.connect({socket:socket, host:host, port:port}, function () {
            var secureSocket = this;
            console.info(srvId, logId, logSubId, "tls negotiated");
            stream.remoteEmit('secureConnect');
            stream.pipe(secureSocket).pipe(stream);
        }); else stream.pipe(socket).pipe(stream);
      }).on('error', function (e) {
        console.warn(srvId, logId, logSubId, "socket error", e.stack);
        stream.emit('error', e);
        stream.destroy();
      }).on('close', function (e) {
        console.log(srvId, logId, logSubId, "socket closed");
        stream.remoteEmit('close');
      }).on('lookup', function () {
        console.info(srvId, logId, logSubId, "dns lookup");
        stream.remoteEmit('lookup');
      });
    });
    stream.on('_pls_timeout', function (msecs) {
      socket.setTimeout(msecs);
    });
    socket.on('timeout', function () {
      console.info(srvId, logId, logSubId, "timeout");
      stream.remoteEmit('timeout');
    });
  });
}).listen(PORT, function(){
  console.log(srvId, "proxy server listening on port", this.address().port);
});
