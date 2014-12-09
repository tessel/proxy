var net = require('net')
  , util = require('util')
  , dns = require('dns')
  , multiplex = require('multiplex');

var HELLO = 0x01
  , SCRAM = 0x02
  , CONNECT = 0x03
  , ACCEPT = 0x04
  , READ = 0x05
  , DATA = 0x06
  , DONE = 0x07
  , ERROR = 0x08;

function ProxiedConnection(connectionId, multiplexer){
  var self = this;
  self.connectionId = connectionId;
  self.multiplexer = multiplexer;
  self.readAvailable = 0;
  self.outgoingQueue = [];
  var options = {};

  // IPv4 for now because IPv6 contains ':'
  if (net.isIP(connectionId.split(':')[0])){ 
    options.host = connectionId.split(':')[0];
    options.port = connectionId.split(':')[1];
  } else {
    dns.lookup(connectionId, function (err, address, family){
      if(err){
        self.emit('error', {message:'DNS error'});
      } else {
        // client will need to send a read request before accept to get address
        // maybe with connect?
        addToOutgoingQueue(address); 
      }
    });
  }
  self.connectionId = connectionId;
  
  if (options.host){
    self.connect(options.port, options.host, function connectionListener(){
      sendAccept(self.localAddress+':'+self.localPort);
    });
    /* 
    TODO - Need to distinguish end/close/error and how to map 
    to TM protocol commands 
    */
    self.addListener('end', sendDone);
    self.addListener('close', sendDone);
    self.addListener('data', addToOutgoingQueue);
  }

  
  function sendAccept(localAddress){
    var payload = new Buffer(self.connectionId+localAddress);
    self.sendCommand(ACCEPT, payload);
  }
  
  function sendDone(had_error){
    var payload = new Buffer(self.connectionId);
    self.sendCommand(DONE, payload);
  }
  
  function addToOutgoingQueue(data){
    if (data instanceof Buffer ){
      self.outgoingQueue.push(data);
    } else {
      self.outgoingQueue.push(new Buffer(data));
    }
    self.sendData();
  }
}
util.inherits(ProxiedConnection, net.Socket);

ProxiedConnection.prototype.updateReadAvailable = function(numBytes){
  this.readAvailable = numBytes;
  this.sendData();
};

ProxiedConnection.prototype.sendData = function(){
  // this will likely require a lock on readAvailable
  if (this.readAvailable && this.outgoingQueue.length > 0){
    var length = 1;
    var data = this.outgoingQueue.shift();
    if (data.length > this.readAvailable) {
      var outData = new Buffer(this.readAvailable);
      data.copy(outData, 0, 0, this.readAvailable);
      data = data.slice(this.readAvailable);
      this.outgoingQueue.unshift(data);
      var payload = Buffer.concat([new Buffer(this.connectionId), outData]);
      this.readAvailable = 0;
      this.sendCommand(DATA, payload);
    } else {
      var payload = Buffer.concat([new Buffer(this.connectionId), data]);
      this.readAvailable -= data.length;
      this.sendCommand(DATA, payload);
      this.sendData();
    }
  }
};

ProxiedConnection.prototype.sendCommand = function(command, payload){
  this.multiplexer.write(Buffer.concat(
    [new Buffer([0xFFFF & payload.length+1, command]), payload]));
};



function ProxyServer(validateSession){
  if (!(this instanceof ProxyServer)) return new ProxyServer();
  net.Server.call(this, {allowHalfOpen: false});
  
  this.addListener('connection', connectionListener);
  
  this.addListener('clientError', function(err, conn){
    conn.destroy(err);
  });
  
  this.timeout = 2*60*1000;
}
util.inherits(ProxyServer, net.Server);


ProxyServer.prototype.setTimeout = function(msecs, callback) {
  this.timeout = msecs;
  if (callback) {
    this.on('timeout', callback);
  }
}


exports.ProxyServer = ProxyServer;


function connectionListener(socket) {
  var self = this;
  socket.activeConnections = {};
  socket.multiplexer = multiplex({}, multiplexOnStream);
  socket.pipe(socket.multiplexer).pipe(socket);
  
  function abortIncoming(){ // TODO
    while (incomingCommands.length) {
      var req = incomingCommands.shift();
      req.emit('aborted');
      req.emit('close');
    }
  }
  
  function serverSocketCloseListener() {
    if (this.parser) { // TODO
      
    }
    abortIncoming();
  }
  
  socket.addListener('error', socketOnError);
  socket.addListener('close', serverSocketCloseListener);
  socket.on('end', socketOnEnd);
  
  function socketOnError(e){
    self.emit('clientError', e, this);
  }

  function socketOnEnd(){
    // go through and end all ProxiedConnections still open
  }
  
  function socketOnDrain(){}
  
  function multiplexOnStream(plexStream, connectionId){
    connectionId = connectionId.toString();
    socket.activeConnections[connectionId] = 
      new ProxiedConnection(connectionId, plexStream);
    
    plexStream.connectionId = connectionId;
    plexStream.on('hello', multiplexOnHello);
    plexStream.on('read', multiplexOnRead);
    plexStream.on('done', multiplexOnDone);
    plexStream.on('error', multiplexOnError);
    // When Tessel as server is implemented
    plexStream.on('data', multiplexOnData);
    //plexStream.on('accept', onAccept) 
  }

  function multiplexOnHello(sessionToken){
    // lookup session token (in a database or on auth server)
    if (validateSession && validateSession(sessionToken)){
      //sendAck(); //TODO
    } else {
      //sendScram(); //TODO
      socket.end();
    }
  }

  function multiplexOnRead(connectionId, numBytes){
    socket.activeConnections[connectionId].updateReadAvailable(numBytes);
  }

  function multiplexOnData(data){
    socket.activeConnections[this.connectionId].updateReadAvailable(5);
  }

  function multiplexOnDone(connectionId){}

  function multiplexOnError(connectionId, error){}

}
