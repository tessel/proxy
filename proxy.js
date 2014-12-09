var proxy = require('./lib/proxy-server')
  , sessionValidator = require('./lib/session_validator.js');

var server = new proxy.ProxyServer(sessionValidator);

server.listen(5005, function(){
  console.log('Proxy listening on port 5005');
});
