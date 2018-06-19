module.exports = function(){

  // http server
  var express = require('express');
  var app = express();
  var http = require('http').Server(app);
  
  var path = require('path');
  var staticPath = path.join(__dirname, 'client');
  console.log(staticPath);
  app.use(express.static(staticPath));
  console.log(process.env);
  app.use(function(req,res,next){
    console.log(req.url);
    next();
  })

  http.listen(3000, function(a){
    console.log(a);
    console.log('listening on *:3000');
  });

  // game server
  var io = require('socket.io')(http);
  var admin = require('./admin')(io); 
}