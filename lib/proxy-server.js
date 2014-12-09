var net = require('net'),
    util = require('util'),
    multiplex = require('multiplex');

function ProxyServer(){
  if (!(this instanceof ProxyServer)) return new ProxyServer();
  net.Server.call(this, {allowHalfOpen: false});
  
  this.on('connection', function (socket) {
    console.log("client");
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
}
util.inherits(ProxyServer, net.Server);

exports.ProxyServer = ProxyServer;
