var proxy = require('./lib/proxy-server'),
    token = require('./lib/token-server');

proxy.ProxyServer().listen(5005, function(){
  console.log('Proxy server listening on port', this.address().port);
});

token.TokenServer().listen(5006, function(){
  console.log('Token server listening on port', this.address().port);
});
