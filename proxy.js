var proxy = require('./lib/proxy-server');

var server = new proxy.ProxyServer();

server.listen(5005, function(){
  console.log('Proxy listening on port 5005');
});
