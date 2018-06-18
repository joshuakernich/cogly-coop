define([], function() {
    
    return function App(isTeacher){
    	var socket = io();
    	socket.on('room',onRoom);

    	socket.emit('chat message', 'hi');
		socket.on('chat message', function(msg){
			console.log(msg);
		});

		$('.input-panel button').click(doCode);

		function doCode(){
			$('.input-panel button').attr('disabled','disabled');
			$('.input-panel button').text('Jumping in...');
			$('.input-panel input').attr('disabled','disabled');
			var code = $('.input-panel input').val();
			socket.emit('code',code,isTeacher);
		}

		function onRoom(room){
			$('.game').empty();

			// Welcome
			$('.input-panel').html('Welcome to '+room.name).delay(1000).animate({top:-120},500,function(){
				$('.input-panel').hide()});

			//Let's play a game

			//Add the css
			$('head').append( $('<link rel="stylesheet" type="text/css"/>').attr('href', './games/'+room.type+'/index.css') );

			//Load the game client
			requirejs(['./games/'+room.type+'/index.js'], function(Game) {
				var game = new Game(socket,$('.game'));
			});
		}

		doCode();
    }
});