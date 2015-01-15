var fs = require('fs'),
    net = require('net'),
    tls = require('tls'),
    streamplex = require('streamplex');

var PORT = +process.env.PORT || 5005,
    KEY_FILE = process.env.KEY_FILE || "private-key.pem",
    CERT_FILE = process.env.CERT_FILE || "public-cert.pem";

//tls.createServer({
//  key: fs.readFileSync(KEY_FILE),
//  cert: fs.readFileSync(CERT_FILE)
//}, function (tunnelSocket) {
net.createServer(function (tunnelSocket) {
  var logId = 'tunnel:'+Math.random().toFixed(20).slice(2);   // just a greppable string
  console.log(logId, "incoming tunnel from", tunnelSocket.remoteAddress);
  
  var tunnel = streamplex(streamplex.A_SIDE),
      authed = false;
  tunnelSocket.pipe(tunnel).pipe(tunnelSocket);
  tunnelSocket.on('error', function (e) {
    console.warn(logId, "tunnel error", e.stack);
    tunnel.destroy(e);
  });
  tunnelSocket.on('close', function () {
    console.log(logId, "tunnel closed");
  });
  tunnel.on('message', function (d) {
    if (d.token === 'DEV-CRED') authed = true;
    tunnel.sendMessage({authed:authed});
    if (authed) console.log(logId, "authenticated");
    else console.warn(logId, "auth failed!");
  });
  tunnel.on('stream', function (stream, type) {
    if (!authed) {
      console.warn(logId, "unauthorized stream request!");
      tunnel.sendMessage({error:"Not authorized!"});
      return tunnelSocket.destroy();
    }
    var logSubId = 'stream:'+Math.random().toFixed(5).slice(2);
    console.info(logId, logSubId, "creating socket");
    
    var socket = new net.Socket();
    stream.on('_pls_connect', function (port, host) {
      console.log(logId, logSubId, "connection request:", host, port, type);
      // TODO: how to prevent unwanted (i.e. LAN/loopback) outbound?
      socket.connect(port, host, function () {
        console.info(logId, logSubId, "connection success");
        stream.remoteEmit('connect');
        if (type === 'tls') tls.connect({socket:socket, host:host, port:port}, function () {
            var secureSocket = this;
            console.info(logId, logSubId, "tls negotiated");
            stream.remoteEmit('secureConnect');
            stream.pipe(secureSocket).pipe(stream);
        }); else stream.pipe(socket).pipe(stream);
      }).on('error', function (e) {
        console.warn(logId, logSubId, "socket error", e.stack);
        stream.emit('error', e);
        stream.destroy();
      }).on('close', function (e) {
        console.log(logId, logSubId, "socket closed");
        stream.remoteEmit('close');
      }).on('lookup', function () {
        console.info(logId, logSubId, "dns lookup");
        stream.remoteEmit('lookup');
      });
    });
    stream.on('_pls_timeout', function (msecs) {
      socket.setTimeout(msecs);
    });
    socket.on('timeout', function () {
      console.info(logId, logSubId, "timeout");
      stream.remoteEmit('timeout');
    });
  });
}).listen(PORT, function(){
  console.log("proxy server listening on port", this.address().port);
});
