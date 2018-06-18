define([], function() {
    
    return function App(){
    	var socket = io();
    	socket.on('rooms',onRooms.bind(this));
    	socket.on('users',onUsers.bind(this));

		this.makeRoom = function(){
			socket.emit('make room',socket.id);
		}

		function onUsers(users){
			$('.user-list').empty();
			for(id of users){
				var $user = $('<div class="user">').appendTo('.user-list').html(id);
			}
		}

		function onRooms(rooms){
			console.log('rooms',rooms);
			$('.room-list').empty();
			for(id in rooms){
				var $room = $('<div class="room">').appendTo('.room-list').html(id);
				var room = rooms[id];
				if(room.sockets[socket.id])$room.addClass('inside');
			}
		}
    }
});