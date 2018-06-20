define(['core/chat'], function(ChatBox) {

    return function Game(socket,$el){

        var me = undefined;
    	var SCALE = 25;
        var doEnding = false;
        var didEnding = false;

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

        var $elCoins = $('<div class="coin-inventory"><div class="chest"></div><div class="coin"></div></div>').appendTo($elUX);
        var $elCoinCount = $('<div class="coin-count">').appendTo($elCoins);
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
        socket.on('update',onUpdate);
        socket.on('artefact',onArtefact);
        socket.on('door',onDoor);
        socket.on('chat-from-room',onChatFromRoom);
        socket.on('victory',onVictory);
        socket.on('reset',onReset);

        $elPopup.hide();

        function onReset(){
            doEnding = didEnding = false;
            chatBox.reset();
            $elEnding.hide();
        }

        function onVictory(){
            

            //doEnding = true;

            //$elEnding.append('<div class="ending-victory">VICTORY</div>');
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

        function Platform(def){
            var $el = $('<div class="platform">').appendTo($elBG);
            $el.css({
                left:(def.x-def.w/2)*SCALE,
                bottom:def.y*SCALE -23,
                width:(def.w)*SCALE
            });

            this.update = function(){

            }
        }

    	function Box(def){
    		var $el = $('<div class="box">').appendTo($elWorld);
    		$el.css({
    			left:(def.x-def.w/2)*SCALE,
    			bottom:(def.y-def.h/2)*SCALE,
    			width:(def.w)*SCALE,
    			height:(def.h)*SCALE
    		});

            this.update = function(){

            }
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
                    } else if(list[id].type == 'box'){
                        dynamics[id] = new Box(list[id]);
                    } else if(list[id].type == 'platform'){
                        dynamics[id] = new Platform(list[id]);
                    } else if(list[id].type == 'coin'){
                        dynamics[id] = new Coin(list[id]);
                        $elMG.append(dynamics[id].$el);
                    }
    			}

                if(id == socket.id) var me = dynamics[id]

                if(list[id].type=='switchset' && list[id].isDoor && list[id].claimed) doEnding = true;

                dynamics[id].update(list[id]);
    			dynamics[id].markForRemoval = false;
    		}

            if(doEnding && !didEnding){
                $elEnding.show();
                $elPopup.hide();

                var coinCount = 0;
                var theDoor;
                for(var id in list){
                    if(list[id].type=='switchset' && list[id].isDoor) theDoor = dynamics[id];
                    if(list[id].type=='coin') coinCount++;
                }

                for(var id in list){
                    if(list[id].type == 'player'){
                        for(var i=0; i<coinCount; i++){
                            var $elCoin = $('<div class="coin">').appendTo($elEnding);
                            var oDoor = theDoor.$el.find('.chest').offset();
                            var oPlayer = dynamics[id].$el.offset();
                            $elCoin.offset(oPlayer)
                            var oPlayer = $elCoin.position();
                            oPlayer.left += 15;
                            oPlayer.top += 20;

                            $elCoin.offset({left:oDoor.left+20,top:oDoor.top+20})
                            .css({opacity:0})
                            .delay(i*100)
                            .animate({opacity:1},10)
                            .animate({top:oPlayer.top-50})
                            .animate({left:oPlayer.left,top:oPlayer.top-50})
                            .animate({left:oPlayer.left,top:oPlayer.top})
                            .animate({opacity:0},10)
                        }
                        
                    }
                }

                didEnding = true;
            }

            var inventory = []
            var coins = 20;
            for(var id in list){
                if(list[id].claimed && (list[id].type == 'switchset' || list[id].n == me.n)){
                    inventory.push(list[id])
                }

                if(list[id].claimed && list[id].type == 'coin'){
                    coins++;
                }
            }

            $elCoinCount.html(coins);

            syncArtefactInventory(inventory,me.n)

            for(var id in dynamics){
                if(dynamics[id].markForRemoval){
                    dynamics[id].die();
                    delete dynamics[id];
                }
            }
    	}

        function Coin(bean){
            this.claimed = false;

            var $el = $('<div class="coin">');
            $el.css({
                left:(bean.x)*SCALE,
                bottom:(bean.y)*SCALE,
                'animation-delay':'-'+(Math.random()*2)+'s'
            })

            this.$el = $el;

            this.update = function(bean){
                if(this.claimed != bean.claimed){
                    this.claimed = bean.claimed;
                    $el.hide();
                    if(!this.claimed) $el.show();
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
                if(bean.isOpen != isOpen){
                    isOpen = bean.isOpen;
                    this.$el.addClass('open');
                    if(!isOpen) this.$el.removeClass('open');
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
            this.isDoor = bean.isDoor;

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
                var $elChest = $('<div class="chest">').appendTo(this.$el);
                $elChest.css({left:25,bottom:-15})
                var $elDome = $('<div class="switch-dome">').appendTo(this.$el);
                $elDome.css({left:1*SCALE});
            }

            var iTick = 0;
            this.claimed = false;

            this.update = function(bean){
                if(bean.cnt != this.cnt){
                    this.cnt = bean.cnt;

                    for(var i=0; i<this.$els.length; i++){
                        this.$els[i].remove();
                    }

                    this.$els.length = 0;

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

                if(this.open != bean.open){
                    this.open = bean.open;
                    $el.addClass('open');
                    if(!this.open) $el.removeClass('open')
                }

                if(bean.claimed != this.claimed){
                    this.claimed = bean.claimed;
                    $el.addClass('claimed');
                    if(!this.claimed) $el.removeClass('claimed');
                }
                
            }

            this.update(bean);

            this.die = function(){
                $el.remove();
            }
        }

        function track(left,bottom){
            //track me
            var w = $elView.width();
            var h = $elView.height();
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

