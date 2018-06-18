define(['core/chat'], function(ChatBox) {

    return function Game(socket,$el){

        var me = undefined;
    	var SCALE = 25;

    	$el.addClass('platformer');

        var $elView = $('<div class="layer">').appendTo($el);

        var $elUX = $('<div class="layer untouchable">').appendTo($el);
        var $btnReset = $('<button class="reset-button">').appendTo($elUX);

        $btnReset.click(function(){
            socket.emit('reset');
        });

        var $elEnding = $('<div class="layer victory-screen">').appendTo($el).hide();

        var $elWorld = $('<div class="world">').appendTo($elView);

        var $elBG = $('<div class="world-layer">').appendTo($elWorld);
        var $elMG = $('<div class="world-layer">').appendTo($elWorld);
        var $elPlayer = $('<div class="world-layer">').appendTo($elWorld);

        var $elPopup = $('<div class="popup">').appendTo($el);
        $('<div class="popup-vert">').appendTo($elPopup);
        var $elPopupContentPanel = $('<div class="popup-content-panel">').appendTo($elPopup);
        var $elPopupContent = $('<div class="popup-content">').appendTo($elPopupContentPanel);
        var $elPopupClose = $('<div class="popup-close-button">').appendTo($elPopupContentPanel);
        $elPopupClose.on('mousedown',onClosePopup.bind(this));

        var $elHints = $('<div class="hint-panel">').appendTo($elUX);
    	var $elInventory = $('<div class="inventory-panel">').appendTo($elUX);

        var chatBox = new ChatBox(socket);
        $elUX.append(chatBox.$el);


    	function DebugDraw(socket){
            var scale = 5;
            var w = 150
            var h = 50;

            this.$el = $('<canvas width='+w*scale+' height='+h*scale+'/>')

            var ctx = this.$el[0].getContext("2d");

            socket.on('DrawSolidPolygon',function(vertices,cnt,c){
                ctx.beginPath();
                for(var i=0; i<cnt; i++){
                    if(i==0){
                        ctx.moveTo(vertices[i].x*scale,h*scale-vertices[i].y*scale);
                    } else {
                        ctx.lineTo(vertices[i].x*scale,h*scale-vertices[i].y*scale);
                    } 
                }
                ctx.lineTo(vertices[0].x*scale,h*scale-vertices[0].y*scale);
                ctx.stroke();
            })

            socket.on('ClearDebug',function(){
                ctx.clearRect(0, 0, w*scale, h*scale);
            });
        }

        var draw = new DebugDraw(socket);
        $el.append(draw.$el);

    	function onMove(e){
    		var p = $elWorld.offset();
    		//socket.emit('target',(e.pageX-p.left)/SCALE,-(e.pageY-(p.top+$elWorld.height()))/SCALE);
    	}

    	function onJump(e){
            var p = $elWorld.offset();
            socket.emit('target',(e.pageX-p.left)/SCALE,-(e.pageY-(p.top+$elWorld.height()))/SCALE);

            $elWorld.find('.target').remove();
            var $elTarget = $('<div class="target">').appendTo($elWorld);
            $elTarget.css({left:e.pageX-p.left,bottom:-(e.pageY-(p.top+$elWorld.height()))});
    		//socket.emit('jump');
    	}

    	var dynamics = {};

        socket.on('static-list',onStaticList);
        socket.on('hint-list',onHintList);
        socket.on('update',onUpdate);
        socket.on('artefact',onArtefact);
        socket.on('door',onDoor);
    	socket.on('hints',onHintList);
        socket.on('chat-from-room',onChatFromRoom);
        socket.on('victory',onVictory);
        socket.on('reset',onReset);

        $elPopup.hide();

        function onReset(){
            chatBox.reset();
        }

        function onVictory(){
            $elEnding.show();
            $elEnding.append('<div class="ending-victory">VICTORY</div>');
        }

        function onChatFromRoom(msg,origin){
            var o;
            for(var i in dynamics){
                if(i == origin.id){
                    o = dynamics[i].$el.offset();   
                }           
            }
            chatBox.add(msg,origin,o);
        }

        function onHintList(list){
            
        }

        function onArtefact(content){
            $elPopupContent.empty();
            if(content.type == 'tool' && content.subtype){
                //Add the css
                $('head').append( $('<link rel="stylesheet" type="text/css"/>').attr('href', './tools/'+content.subtype+'/index.css') );

                //Load the game client
                requirejs(['./tools/'+content.subtype+'/index.js'], function(Tool) {
                    var tool = new Tool(content);
                    $elPopupContent.append(tool.$el);
                    
                });
            } else {
                $elPopupContent.append(content.html);
            }

            $elPopup.show();
            setGameMode(false);
        }

        function onDoor(content){
            $elPopupContent.empty();

            var $elDoorPopup = $('<div class="door-popup">').appendTo($elPopupContent);
            var $elQuestion = $('<div class="door-question">').appendTo($elDoorPopup);
            var $btnCheck = $('<button class="btn-check">Check</button>').appendTo($elDoorPopup);

            for(var iChunk in content){
                var chunk = content[iChunk];
                if(typeof(chunk) != 'object'){
                    $elQuestion.append(chunk)
                } else if(chunk.type == 'input'){
                    var $elChunk = $('<input>').appendTo($elQuestion);
                    $elChunk.on('keypress',function(){
                        $elChunk.removeClass('correct incorrect')
                    })
                    chunk.$el = $elChunk
                }
            }

            $btnCheck.click(function(){
                var isValid = true;
                for(var iChunk in content){
                    var chunk = content[iChunk];
                    if(typeof(chunk) != 'object'){
                        isValid = isValid;
                    } else if(chunk.type == 'input'){
                        var thisOneValid = chunk.$el.val() == chunk.target;
                        isValid = isValid && thisOneValid;
                    }
                    
                }
                socket.emit('attempt',isValid);
            });

            $elPopup.show();
            setGameMode(false);
        }

        function setGameMode(b){
            $elView.off('mousemove',onMove);
            $elView.off('mousedown',onJump);
            if(b){
                $elView.on('mousemove',onMove);
                $elView.on('mousedown',onJump);
            }
        }

        setGameMode(true);

        function onClosePopup(e){
            e.stopPropagation();
            $elPopup.hide();
            setGameMode(true);
        }

        var artefacts = {};

    	function onStaticList(list){
    		for(var i in list){
    			var item = list[i];
                if(item.type == 'box') drawBox(item);
                if(item.type == 'platform') drawPlatform(item);
    		}
    	}

        function drawPlatform(def){
            var $el = $('<div class="platform">').appendTo($elBG);
            $el.css({
                left:(def.x-def.w/2)*SCALE,
                bottom:def.y*SCALE -23,
                width:(def.w)*SCALE
            });
        }

    	function drawBox(def){
    		var $el = $('<div class="box">').appendTo($elWorld);
    		$el.css({
    			left:(def.x-def.w/2)*SCALE,
    			bottom:(def.y-def.h/2)*SCALE,
    			width:(def.w)*SCALE,
    			height:(def.h)*SCALE
    		});
    	}

    	function onUpdate(list){

            /*list['door'] = {type:'door',x:80,y:0};
            list['switch0'] = {type:'switch',n:0,x:40,y:0};
            list['switch1'] = {type:'switch',n:1,x:42,y:0};
            list['switch2'] = {type:'switch',n:2,x:44,y:0};
            list['switch3'] = {type:'switch',n:3,x:46,y:0};*/

            for(var id in dynamics) dynamics[id].markForRemoval = true;

    		for(var id in list){
    			if(!dynamics[id]){
                    if(list[id].type == 'player'){
                        dynamics[id] = new Player(list[id]);
                        $elPlayer.append(dynamics[id].$el);
                    } else if(list[id].type == 'teacher'){
                        dynamics[id] = new Teacher(list[id]);
                        $elPlayer.append(dynamics[id].$el);
                    } else if(list[id].type == 'artefact'){
                        dynamics[id] = new Artefact(list[id]);
                        $elMG.append(dynamics[id].$el);
                    } else if(list[id].type == 'door'){
                        dynamics[id] = new Door(list[id]);
                        $elMG.append(dynamics[id].$el);
                    } else if(list[id].type == 'switchset'){
                        dynamics[id] = new SwitchSet(list[id]);
                        $elMG.append(dynamics[id].$el);
                    }
    			}

                if(id == socket.id) var me = dynamics[id]
  
                dynamics[id].update(list[id]);
    			dynamics[id].markForRemoval = false;
    		}

            var inventory = []
            for(var id in list){
                if(list[id].claimed && (list[id].type == 'switchset' || list[id].n == me.n)){
                    inventory.push(list[id])
                }
            }

            syncArtefactInventory(inventory,me.n)

            for(var id in dynamics){
                if(dynamics[id].markForRemoval){
                    dynamics[id].die();
                    delete dynamics[id];
                }
            }
    	}

        function Artefact(bean){
            this.n = bean.n;
            this.claimed = false;

            var $el = $('<div class="artefact">');
            $el.addClass(bean.content.type);
            $el.addClass('n'+bean.n);
            $el.css({
                left:(bean.x-bean.w/2)*SCALE,
                bottom:(bean.y-bean.w/2)*SCALE,
                width:(bean.w)*SCALE,
                height:(bean.w)*SCALE,
                'animation-delay':'-'+(Math.random()*2)+'s'
            })

            this.$el = $el;

            this.update = function(bean){
                if(bean.n != this.n){
                    this.n = bean.n;
                    $el.removeClass('n0 n1 n2 n3 n4 n5 n6 n7 n8 n9');
                    $el.addClass('n'+bean.n);
                }

                if(this.claimed != bean.claimed){
                    this.claimed = bean.claimed;
                    $el.hide();
                    if(!this.claimed) $el.show();
                }
            }

            this.die = function(){
                $el.remove();
            }
        }

        function Door(bean){
            var isOpen = false;
            var $el = $('<div class="door">');
            $el.css({left:bean.x*SCALE,bottom:bean.y*SCALE})    

            this.$el = $el;

            this.update = function(bean){
                if(bean.isOpen && !isOpen){
                    isOpen = bean.isOpen;
                    this.$el.addClass('open');
                }
            }

            this.die = function(){
                $el.remove();
            }
        }

        function SwitchSet(bean){

            var $el = $('<div class="switchset">');
            $el.css({left:bean.x*SCALE,bottom:bean.y*SCALE}) 

            this.$el = $el;
            this.$els = {};

            var $elDomeSwitch = $('<div class="switch">').appendTo(this.$el);
            $elDomeSwitch.css({left:2*SCALE});

            if( !bean.isDoor ){
                var $elArtefact = $('<div class="artefact">').appendTo(this.$el);
                $elArtefact.addClass(bean.content.type);
                $elArtefact.addClass('nAll');
                $elArtefact.css({left:2*SCALE-13,bottom:20})
                var $elDome = $('<div class="switch-dome">').appendTo(this.$el);
                $elDome.css({left:1*SCALE});
            } else {
                $elDomeSwitch.hide();
            }

            var iTick = 0;
            this.claimed = false;

            this.update = function(bean){
                if(bean.cnt != this.cnt){
                    this.cnt = bean.cnt;
                    for(var i=0; i<this.cnt; i++){
                        this.$els[i] = $('<div class="switch">').appendTo(this.$el);
                        var x = -i*2;
                        this.$els[i].css({left:x*SCALE})    
                        this.$els[i].addClass('n'+i);
                    }
                }

                for(var n in bean.switchMap){
                    if(this.$els[n].hasClass('switched') != bean.switchMap[n]) this.$els[n].toggleClass('switched');
                }

                if(!bean.isDoor){
                    iTick++;
                    $elArtefact.removeClass('n0 n1 n2 n3 n4 n5 n6 n7 n8 n9');
                    $elArtefact.addClass('n'+Math.floor(iTick/10)%9);
                }

                if(!bean.isDoor && bean.claimed != this.claimed){
                    this.claimed = bean.claimed;
                    $elDome.hide();
                    $elArtefact.hide();
                    if(!this.claimed){
                        $elDome.show();
                        $elArtefact.show();
                    }
                }
                
            }

            this.update(bean);

            this.die = function(){
                $el.remove();
            }
        }

        function track(left,bottom){
            //track me
            var w = $el.width();
            var h = $el.height();
            var wWorld = $elWorld.width();
            var hWorld = $elWorld.height();
            var scrollLeft = Math.min(100,Math.max(-(wWorld-w)-100,-left+w/2));
            var scrollBottom = Math.max(Math.min(100,-bottom+300),h-hWorld-100);
            $elWorld.css({left:scrollLeft,bottom:scrollBottom});
        }


        var inventory = {};
        function syncArtefactInventory(list,n){
            for(var i in inventory) inventory[i].markForRemoval = true;

            for(var i in list){
                var bean = list[i];
                if(!inventory[bean.id]){
                    var $btn = $('<div class="inventory-button">').appendTo($elInventory);
                    $btn.addClass('n'+n);
                    $btn.addClass(bean.content.type);
                    $btn.data('bean',bean)
                    $btn.click(function(e){

                        onArtefact($(e.currentTarget).data('bean').content);
                    })
                    inventory[bean.id] = $btn;
                }

                inventory[bean.id].markForRemoval = false;
            }

            for(var i in inventory){
                if(inventory[i].markForRemoval){
                    inventory[i].remove()
                    delete inventory[i];
                }
            }
        }

    	function Player(bean){
            this.n = bean.n;
    		this.$el = $('<div class="player">');
            var isMe = (bean.id == socket.id);
            if(isMe){
                this.$el.addClass('isMe');
                me = bean;
            }
            this.$el.addClass('n'+bean.n);

    		this.update = function(bean){
                var left = (bean.x-0.5)*SCALE;
                var bottom = (bean.y-1)*SCALE;
    			this.$el.css({left:left,bottom:bottom});
                this.$el.removeClass('standing running jumping');
                this.$el.addClass(bean.state);

                if(isMe){
                    track(left,bottom);
                }

                if(bean.n != this.n){
                    this.n = bean.n;
                    this.$el.removeClass('n0 n1 n2 n3 n4 n5 n6 n7 n8 n9');
                    this.$el.addClass('n'+bean.n);
                }
    		}

            this.die = function(){
                this.$el.remove();
            }
    	}

        function Teacher(bean){
            this.$el = $('<div class="teacher">');
            var isMe = (bean.id == socket.id);
            this.update = function(bean){
                var left = bean.x*SCALE;
                var bottom = bean.y*SCALE;
                this.$el.css({left:left,bottom:bottom});
                if(isMe) track(left,bottom);
            }  

            this.update(bean);

            this.die = function(){
                this.$el.remove();
            }
        }
    }
});

