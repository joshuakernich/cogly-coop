module.exports = function(){

  // http server
  var express = require('express');
  var app = express();
  var http = require('http').Server(app);
  
  var path = require('path');
  var staticPath = path.join(__dirname, 'client');
  app.use(express.static(staticPath));

  http.listen(3000, function(a){
    console.log('listening on *:3000');
  });

  // game server
  var io = require('socket.io')(http);
  var admin = require('./admin')(io); 
}