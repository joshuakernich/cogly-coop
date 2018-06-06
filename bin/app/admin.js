var Room = require('./room')

module.exports = function(io){

  var roomUniqueID = 0
  var rooms = []

  io.on('connection', onConnect.bind(this));

  var first = true;

  // this function becomes a proxy for a user connection
  function onConnect(socket){
    var myRoomID = null;

    socket.on('disconnect', onDisconnect);
    socket.on('make room', onMakeRoom);
    socket.on('code', onCode);

    function onDisconnect(){
      updateEveryone();
    }

    function onMakeRoom(socketID){
      roomUniqueID++;
      var bean = {id:roomUniqueID,code:'1234',name:"The First Challenge",type:"platformer"};
      var room = new Room(bean,io);
      room.callbackChange = updateEveryone;
      rooms[roomUniqueID] = room;
      room.join(socket);
    }

    function updateEveryone(){
      io.sockets.emit('rooms',io.sockets.adapter.rooms);
      io.sockets.emit('users',Object.keys(io.sockets.sockets));
    }

    function onCode(code,isTeacher){
      for(id in rooms){
        if(rooms[id].bean.code == code){
          myRoomID = id;
          rooms[id].join(socket,isTeacher);
        }
      }
    }

    updateEveryone();
    if(first){ // let's make a room by default
      onMakeRoom(socket.id);
      first = false;
    }
  }
}