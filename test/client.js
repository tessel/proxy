var multiplex = require('multiplex')
  , net = require('net');

var plex = multiplex()
var socket = net.createConnection(5005);

socket.pipe(plex).pipe(socket);

var stream = plex.createStream();

stream.write(new Buffer('streaming'));
  
stream.on('data', console.log);
