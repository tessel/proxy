var net = require('net'),
    streamplex = require('streamplex');

net.connect(5006).on('data', function (d) {
    net.connect(5005, function () {
        console.log("connected to proxy");
        
        var tunnel = streamplex({n:2,of:2}, function () {
            // this shouldn't be called until we add inbound connections
            console.warn("Incoming stream???");
        }), socket = this;
        socket.pipe(tunnel).pipe(socket);
        
        var test = tunnel.createStream("ipcalf.com:80");
        test.write(["GET / HTTP/1.1","Host: ipcalf.com","Connection: close","",""].join('\r\n'));
        test.on('data', function (d) {
            console.log("DATA", d.toString());
        });
        test.on('end', function () {
            console.log(">>> DONE <<<");
            socket.end();
        });
    }).write(d);
}).write("DEV-CRED");


