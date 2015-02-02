var cluster = require('cluster'),
    NUM_WORKERS = process.env.NUM_WORKERS || require('os').cpus().length;

var srvId = 'proc:'+process.pid;

if (cluster.isMaster) {
  console.log(srvId, "forking", NUM_WORKERS, "workers");
  for (var i = 0; i < NUM_WORKERS; i++) cluster.fork();
  cluster.on('exit', function (worker, code, signal) {
    console.warn(srvId, "forking replacement worker after", worker.process.pid, "exit:", signal || code);
    cluster.fork();
  });
} else require("./proxy.js");
