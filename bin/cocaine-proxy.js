#!/opt/nodejs/0.8/bin/node

var cluster = require("cluster");

var argv = require("optimist").argv

var Proxy = require("cocaine-http-proxy").Proxy


var numWorkers = argv["num-workers"] || 1
var listenPort = parseInt(argv["port"])

listenPort = isNaN(listenPort) ? listenPort : 8181

var dbg = 0

if (cluster.isMaster) {
  for (var i = 0; i < numWorkers; i++) {
    cluster.fork()
  }
  cluster.on("exit", function(worker, code, signal) {
    console.log("worker " + worker.process.pid + " died")
  })
} else {
  var P = new Proxy(function(rq,rs0){
    dbg && console.log("rq.url",rq.url)
    var chunks = [this.bakeHeader(rq)]
    var se = this.getRoute(rq.url)
    if(!se){
      rs0.writeHead(503)
      rs0.end("no service found")
    } else {
      this.getApp(se[0],function(err,app){
        dbg && console.log("err,app:",err,app)
        if(err){
          rs0.writeHead(503)
          rs0.end("no service found: "+se[0])
        } else {
          rq.on("data",function(chunk){
            chunks.push(chunk)
          })
          rq.on("end",function(){
            var rs1 = app.invoke(se[1],Buffer.concat(chunks))
            rs1.pipe(rs0)
          })
        }
      })
    }
  })

  P.listen(listenPort)
}






