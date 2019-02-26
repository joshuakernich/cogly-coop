module.exports = class App

  constructor:()->
    #http server
    express = require 'express'
    app = express();
    http = require('http').Server app
    
    path = require('path');
    staticPath = path.join(__dirname, 'client');
    app.use(express.static(staticPath));

    http.listen 80, ()->
      console.log 'just go to localhost mate'

    #game server
    io = require('socket.io')(http)
    Admin = require('./admin')
    admin = new Admin(io)