Room = require './room'

module.exports = class Admin

  constructor:(@io)->

    @roomUniqueID = 0
    @rooms = []
    @users = []
    @autoFirstRoom = false

    io.on 'connection', @onConnect.bind(this)
  
  # The world has changed. Tell everyone about ALL the people and ALL the rooms.
  updateEveryone:()->

    serial = {rooms:[],users:[]}
    for room in @rooms
      serial.push room.serialise()


    @io.sockets.emit 'rooms',@rooms

    @io.sockets.emit 'socket-rooms',@io.sockets.adapter.rooms
    @io.sockets.emit 'socket-users',Object.keys(@io.sockets.sockets)

  onConnect:(socket)->

    socket.on 'disconnect', @onDisconnect.bind(@)
    socket.on 'make-room', @onMakeRoom.bind(@)
    socket.on 'code-room', @onCode.bind(@)
    @users[socket.id] = {name:"Josh"}
    @updateEveryone()

    onCodeRoom:(code)->
      for(id in @rooms)
        if(@rooms[id].bean.code == e.code) then @rooms[id].join socket

    onMakeRoom:(connection)->
      @roomUniqueID++;

      bean = {
        id:@roomUniqueID,
        code:'1234',
        name:"The First Challenge",
        type:"platformer"
      }

      @rooms[@roomUniqueID] = new Room bean,@io
      @rooms[@roomUniqueID].on 'change', @updateEveryone.bind(@)
      