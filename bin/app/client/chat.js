define([], function() {
    
    return function ChatBox(socket){
    	
    	this.$el = $('<div class="chat-box">');
    	this.$el.append("Chat<br>");
    	
    	var $elStream = $('<div>').appendTo(this.$el);
    	var $elInput = $('<input>').appendTo(this.$el);
    	$elInput.on('keypress',onKey);

    	this.add = function(message){
    		var $elChat = $('<div class= "chat-message">').html(message);
    		$elChat.appendTo($elStream);
    	}

    	function onKey(e){
    		if(e.which == 13){ //Enter
    			socket.emit('chat-to-room',$elInput.val());
    			$elInput.val('');
    		}
    	}
    	
    }
});