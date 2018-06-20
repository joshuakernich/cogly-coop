define(["./html2canvas"], function(html2canvas) {
    
    return function ChatBox(socket){
        var $el = this.$el = $("<div class='chat-layer untouchable'>");
        
        var $elChatBox = $('<div class="chat-box">').appendTo(this.$el);
    	$elChatBox.append("Chat<br>");
    	
    	var $elStream = $('<div class="chat-stream">').appendTo($elChatBox);
        
        var $elInputBox = $('<div class="chat-input">').appendTo($elChatBox);
        var $elInput = $('<input>').appendTo($elInputBox);
        

        var $elCommands = $('<div class="chat-commands">').appendTo($elChatBox);
        var $elCaptureButton = $('<div class="chat-button screenshot">').appendTo($elCommands);
        var $elHintButton = $('<div class="chat-button hint">').appendTo($elCommands);
        var $elHelpButton = $('<div class="chat-button help">').appendTo($elCommands);
    	var $elCaptureWindow = $('<div class="screenshot-window">').appendTo($elChatBox);

        $elCaptureButton.on('click',onScreenCapture.bind(this));
        $elHintButton.on('click',onHintRequest.bind(this));
        $elHelpButton.on('click',onHelpRequest.bind(this));
    	$elInput.on('keypress',onKey);

        var emotes = [
            {type:'thumbs-up'},
            {type:'love'},
            {type:'confused'},
        ]

        function reset(){
            $elStream.empty();
        }

    	function add(message,origin,offset){
    		var $elMsg = $('<div class= "chat-message">').html(message);
            var $elEmote = $('<div class="chat-emote">').appendTo($elMsg);

            for(var i in emotes){
                var $el = $('<div class="chat-emote-button">').appendTo($elEmote);
                $el.addClass(emotes[i].type);
            }

            $elMsg.addClass('n'+origin.n);
            if(origin.id == socket.id) $elMsg.addClass('isMe');
    		$elMsg.appendTo($elStream);

            $elStream.scrollTop($elStream.height());

            if(offset){
                offset.top -= $elMsg.outerHeight()+5;
                offset.left -= 80;

                $elClone = $elMsg.clone().appendTo($elStream).css('position','fixed');
                $elMsg.css('opacity',0);
                $elClone.offset(offset).delay(800).animate($elMsg.offset(),function(){
                $elClone.remove();
                $elMsg.css('opacity',1);
                })
            }
    	}

    	function onKey(e){
    		if(e.which == 13){ //Enter
    			send($elInput.val())
                $elInput.val('');
    		}
    	}

        function send(msg){
            socket.emit('chat-to-room',msg);
        }

        function onHintRequest(msg){
            socket.emit('hint-request');
        }

        function onHelpRequest(){
            socket.emit('chat-to-room','Teacher help requested')
        }

        function onScreenCapture(e){
            $el.removeClass('untouchable');
            $elCaptureButton.addClass('active');

            var x = 0;
            var y = 0;
            var width = 0;
            var height = 0;

            $el.on('mousedown',onStartBoundingBox);

            function onStartBoundingBox(e){

                x = e.pageX;
                y = e.pageY;
                $el.off('mousedown',onStartBoundingBox);
                $el.on('mousemove',onAdjustBoundingBox);
                $el.on('mouseup',onConfirmBoundingBox);
                $elCaptureWindow.show();
                $elCaptureWindow.css({left:x,top:y,width:10,height:10});
            }

            function onAdjustBoundingBox(e){
                width = e.pageX-x;
                height = e.pageY-y;
                $elCaptureWindow.css({width:width,height:height});
            }

            function onConfirmBoundingBox(){
                $el.off('mousemove',onAdjustBoundingBox);
                $el.off('mouseup',onConfirmBoundingBox);
                html2canvas(document.body,{x:x,y:y,width:width,height:height}).then(onScreenshotReady.bind(this));

                $elCaptureWindow.addClass('snapping');
            }

            function onScreenshotReady(canvas){

                var wMax = 200;
                var hMax = 200;

                var ratio = Math.min(wMax/canvas.width,hMax/canvas.height);
                
                var fixedCanvas = $("<canvas width="+canvas.width*ratio+" height="+canvas.height*ratio+">");

                var ctx2 = fixedCanvas[0].getContext('2d');
                ctx2.scale(ratio,ratio);
                ctx2.drawImage(canvas,0,0);

                var img = new Image();//'<img src='+fixedCanvas[0].toDataURL()+'/>';
                img.src = fixedCanvas[0].toDataURL();
                document.body.appendChild(img);


                $el.addClass('untouchable');
                $elCaptureWindow.removeClass('snapping');
                $elCaptureWindow.hide();


                $elCaptureButton.removeClass('active');

                send(img.outerHTML);
            }
        }

        this.add = add;
        this.reset = reset;
        
    	
    }
});