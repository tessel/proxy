// NOTE: only works under node.js atm

var net = require('net'),
    multiplex = require('multiplex');

net.connect(5005, function () {
    console.log("connected to proxy");
    
    var tunnel = multiplex({error:true}, function () {
        // this shouldn't be called until we add inbound connections
        console.warn("Incoming stream???");
    }), socket = this;
    socket.pipe(tunnel).pipe(socket);
    
    socket.write("DEV-TOKEN.4MAboyv4bCaBfFtqdoPwFAfwy3JqrLHmebNG2SB9gh8");
    
    var test = tunnel.createStream("localhost:8080");
    test.write("HELLO");
    test.on('data', function (d) {
        console.log("DATA", d.toString());
    });
    test.on('end', function () {
        console.log("END");
    });
});
