define([], function() {
    
    return function App(){
    	var socket = io();
    	socket.on('rooms',onRooms.bind(this));
    	socket.on('users',onUsers.bind(this));

		this.makeRoom = function(){
      console.log('client make-room');
			socket.emit('make-room',socket.id);
		}

		function onUsers(users){
			$('.user-list').empty();
			for(id of users){
				var $user = $('<div class="user">').appendTo('.user-list').html(id);
			}
		}

		function onRooms(rooms){

			$('.room-list').empty();
			for(id in rooms){

        if( rooms[id].length == 1 && Object.keys(rooms[id].sockets)[0] == id ) continue; //this is just a user's personal room

				var $room = $('<div class="room">').appendTo('.room-list').html("ROOM ID:"+id);
				var room = rooms[id];
        for(iSocket in room.sockets){
          $room.append("<hr>" + iSocket)
        }
				//if(room.sockets[socket.id])$room.addClass('inside');
			}
		}
    }
});