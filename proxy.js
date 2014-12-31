var net = require('net'),     // TODO: tls
    streamplex = require('streamplex');

var PORT = +process.env.PORT || 5005;

net.createServer(function (tunnelSocket) {
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
    
    var SocketClass = (type === 'tls') ? tls.TLSSocket : net.Socket,
        socket = new SocketClass();
    stream.on('_pls_connect', function (port, host) {
      console.log("connection request:", host, port);
      // TODO: how to prevent unwanted (i.e. LAN/loopback) outbound?
      socket.connect(port, host, function () {
        console.log("connection success");
        if (type === 'tls') stream.remoteEmit('secureConnect');
        else stream.remoteEmit('connect');
        stream.pipe(socket).pipe(stream);
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
