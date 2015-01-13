var fs = require('fs'),
    net = require('net'),
    tls = require('tls'),
    streamplex = require('streamplex');

var PORT = +process.env.PORT || 5005,
    KEY_FILE = process.env.KEY_FILE || "private-key.pem",
    CERT_FILE = process.env.CERT_FILE || "public-cert.pem";

tls.createServer({
  key: fs.readFileSync(KEY_FILE),
  cert: fs.readFileSync(CERT_FILE)
}, function (tunnelSocket) {           // TODO: tls server
  console.log("client opened tunnel socket");
  
  var tunnel = streamplex(streamplex.A_SIDE),
      authed = false;
  tunnelSocket.pipe(tunnel).pipe(tunnelSocket);
  tunnel.on('message', function (d) {
    if (d.token === 'DEV-CRED') authed = true;
    tunnel.sendMessage({authed:authed});
    console.log("client authenticated:", authed);
  });
  tunnel.on('stream', function (stream, type) {
    if (!authed) {
      console.warn("Unauthorized stream request!");
      tunnel.sendMessage({error:"Not authorized!"});
      return tunnelSocket.destroy();
    }
    console.log("client created a stream");
    
    var socket = new net.Socket();
    stream.on('_pls_connect', function (port, host) {
      console.log("connection request:", host, port);
      // TODO: how to prevent unwanted (i.e. LAN/loopback) outbound?
      socket.connect(port, host, function () {
        console.log("connection success");
        stream.remoteEmit('connect');
        if (type === 'tls') tls.connect({socket:socket, host:host, port:port}, function () {
            var secureSocket = this;
            stream.remoteEmit('secureConnect');
            stream.pipe(secureSocket).pipe(stream);
        }); else stream.pipe(socket).pipe(stream);
      }).on('error', function (e) {
        stream.emit('error', e);
        stream.destroy();
      });
    });
    stream.on('_pls_timeout', function (msecs) {
      socket.setTimeout(msecs);
    });
    socket.on('timeout', function () {
      stream.remoteEmit('timeout');
    });
  });
}).listen(PORT, function(){
  console.log('Proxy server listening on port', this.address().port);
});
