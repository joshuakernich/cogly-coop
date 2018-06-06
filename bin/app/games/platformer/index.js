var b2d = require('./jsbox2d');

module.exports = function(room){

  var hints = [];
  var world = new World();
  var actors = {};  // this is a record of every actor. including players.
  var statics = {};
  var theDoor;

  var nPlayer = 0;
  var idUnique = 0;

  function onPlayerList(list){

  }

  function onCommand(cmd,info){

  }

  function onReset(){
    console.log('onReset');
    for(var id in actors){
      console.log(actors[id].type);
      if(actors[id].type == 'player'){
        actors[id].reset();
      } else if(actors[id].type == 'artefact'){
        actors[id].revive();
      } else if(actors[id].type == 'door'){
        actors[id].isOpen = false;
      }
    }
  }



  function tick(){
    syncActors();
    fixArtefactPairing();
    stepActors();
    updateActors();

    for(var id in actors){
      if(actors[id].markForRemoval){
        actors[id].die();
        delete actors[id];
      }
    }
  }

  function fixArtefactPairing(){
    var cntPlayer = 0;
    var cntArtefact = 0;
    for(var id in actors){
      if(actors[id].type == 'player'){
        cntPlayer++;
      } else if(actors[id].type == 'artefact'){
        cntArtefact++;
      }
    }

    var nPlayer = 0;
    var nArtefact = 0;
    for(var id in actors){
      if(actors[id].type == 'player'){
        actors[id].n = nPlayer++;
      } else if(actors[id].type == 'artefact'){
        actors[id].n = nArtefact%cntPlayer;
        nArtefact++;
      }
    }
  }

  function updateActors(){
    var beans = {}

    //collect all the actor beans
    for(var id in actors){
      beans[id] = actors[id].getBean();
    }

    //update all the sockets
    for(var id in actors){

      if(actors[id].socket){
        if(actors[id].new){
        actors[id].new = false;
        setTimeout(function(){
          actors[id].socket.emit('static-list',world.getStaticBeans());
          actors[id].socket.emit('hint-list',hints);
          },500);
        }
        actors[id].socket.emit('update',beans);
      }

      
    }
  }

  function syncActors(){

    //look through all the sockets to see if everyone is connected
    for(var id in actors) if(actors[id].socket) actors[id].markForRemoval = true;

    var sockets = room.getSockets();
    for(var id in sockets){
      if(sockets[id] && !actors[id]){
        if(room.mapSocket[id]){
          //new player
          makeTeacher(id);
        } else {
          //new player
          makePlayer(id);
        }
        
      }
      actors[id].markForRemoval = false;
    }
  }

  function stepActors(){
    for(var id in actors) if(actors[id].step) actors[id].step();
    world.step(1/20);
  }

  function makeTeacher(id){
    actors[id] = new Teacher(world,id,2+Math.random()*5,2,world);
  }

  function makePlayer(id){
    actors[id] = new Player(world,id,nPlayer,2+Math.random()*5,2,world);
    nPlayer++;
  }

  function makePlatform(x,y,w){
    statics[idUnique] = new Platform(world,idUnique,x,y,w);
    idUnique++;
  }

  function makeArtefact(x,y,content){
    actors[idUnique] = new Artefact(world,idUnique,idUnique%2,x,y,content);
    idUnique++;
  }

  function makeDoor(x,y,content){
    actors[idUnique] = theDoor = new Door(world,idUnique,x,y,content);
    idUnique++;
  }

  function makeHint(hint){
    hints.push(hint);
  }

  function winTheGame(){

  }

  function World(){

    var GROUP_ARTEFACT = 1;

    var gravity = new b2d.Vec2(0.0, 0.0);
    var doSleep = false;
    var world = new b2d.World(gravity, doSleep);

    function DebugDraw(){
      this.m_drawFlags = 1;

      /// Set the drawing flags.
      this.SetFlags = function(flags) { this.m_drawFlags = flags; };

      this.GetFlags = function() { return this.m_drawFlags; };

      this.DrawPolygon = function(vertices, vertexCount, color) { room.toAll('DrawPolygon',vertices,vertexCount,color) };

      /// Draw a solid closed polygon provided in CCW order.
      this.DrawSolidPolygon = function(vertices, vertexCount, color) { room.toAll('DrawSolidPolygon',vertices,vertexCount,color) };

      /// Draw a circle.
      this.DrawCircle = function(center, radius, color) { };

      /// Draw a solid circle.
      this.DrawSolidCircle = function(center, radius, axis, color) { };

      /// Draw a line segment.
      this.DrawSegment = function(p1, p2, color) { };
    }

    world.SetDebugDraw(new DebugDraw())

    var listener = new b2d.ContactListener();

    listener.PreSolve = function(c){
      var a = c.GetFixtureA().GetBody().GetUserData();
      var b = c.GetFixtureB().GetBody().GetUserData();
      if(a.solve) a.solve(b,c);
      if(b.solve) b.solve(a,c);
    }

    listener.BeginContact = function(c){
      var a = c.GetFixtureA().GetBody().GetUserData();
      var b = c.GetFixtureB().GetBody().GetUserData();
      if(a.touch) a.touch(b);
      if(b.touch) b.touch(a);
    }

    listener.EndContact = function(c){
      var a = c.GetFixtureA().GetBody().GetUserData();
      var b = c.GetFixtureB().GetBody().GetUserData();
      if(a.untouch) a.untouch(b);
      if(b.untouch) b.untouch(a);
    }
      
    world.SetContactListener(listener);

    var cntBox = 0;

    function makeBox(x,y,w,h){
      var d = new b2d.BodyDef();
      d.position.Set(x, y);
      d.type = 1;
      var b = world.CreateBody(d);
      var s = new b2d.PolygonShape();
      s.SetAsBox(w/2,h/2);

      var f = new b2d.FixtureDef(s);
      f.shape = s;
      b.CreateFixture(f);

      var data = {type:'box',x:x,y:y,w:w,h:h,id:cntBox++}
      b.SetUserData(data);
      statics.push(data);

      return b;
    }

    this.makePlatformBody = function(x,y,w){
      var h = 0.1;
      var b = makeBox(x,y-h/2,w,h);
      return b;
    }

    this.makePlayerBody = function(x,y){
      var d = new b2d.BodyDef();
      d.type = 2;
      d.linearDamping = 0;
      d.position.Set(x, y);
      d.allowSleep = false;
      var b = world.CreateBody(d);
      var s = new b2d.PolygonShape();
      s.SetAsBox(0.48,1);

      var f = new b2d.FixtureDef();
      f.friction = 0.1;
      f.density = 2;
      f.shape = s;
      b.CreateFixture(f);
      b.SetFixedRotation(true);

      return b;
    }

    this.makeBody = function(d){
      return world.CreateBody(d);
    }

    this.add = function(player){
      world.addBody(player.body);
    }

    this.step = function(s){
      world.Step(s,10,20);
      //room.toAll('ClearDebug');
      //world.DrawDebugData();
    }

    this.getStaticBeans = function(){
      return statics;
    }
  }

  function Platform(world,id,x,y,w){
    //y is the top of the platform
    this.id = id;
    this.w = w;
    this.h = 0.1;
    this.x = x;
    this.y = y - this.h/2;
    this.type = 'platform';

    var d = new b2d.BodyDef();
    d.position.Set(this.x, this.y);
    d.type = 1;
    var b = world.makeBody(d);
    var s = new b2d.PolygonShape();
    s.SetAsBox(this.w/2,this.h/2);

    var f = new b2d.FixtureDef(s);
    f.shape = s;
    b.CreateFixture(f);

    b.SetUserData(this);

    this.getBean = function(){
      return {type:this.type,id:this.id,x:this.x,y:this.y,w:this.w,h:this.h};
    }
  }

  function Artefact(world,id,n,x,y,content){
    //y is the floor
    this.x = x;
    this.y = y+1;
    this.w = 1;
    this.content = content;
    this.id = id;
    this.n = n;
    this.type = 'artefact';

    var d = new b2d.BodyDef();
    d.position.Set(this.x,this.y);
    d.type = 1;
    var b = world.makeBody(d);
    var s = new b2d.CircleShape(0.5);
    var f = new b2d.FixtureDef(s);
    f.shape = s;
    f.isSensor = true;
    b.CreateFixture(f);

    b.SetUserData(this);

    this.die = function(){
      b.SetActive(false);
    }

    this.revive = function(){
      console.log('revive');
      b.SetActive(true);
      console.log(b.GetActive());
    }

    this.getBean = function(){
      return {type:this.type,id:this.id,type:this.type,x:this.x,y:this.y,n:this.n,w:this.w,content:this.content};
    }
  }

  function Door(world,id,x,y,content){
    //y is the floor

    this.w = 4;
    this.h = 4;
    this.x = x;
    this.y = y+this.h/2;
    this.content = content;
    this.id = id;
    this.type = 'door';
    this.isOpen = false;

    var d = new b2d.BodyDef();
    d.position.Set(this.x,this.y);
    d.type = 1;
    var b = world.makeBody(d);
    var s = new b2d.PolygonShape();
    s.SetAsBox(this.w/2,this.h/2);;
    var f = new b2d.FixtureDef(s);
    f.shape = s;
    f.isSensor = true;
    b.CreateFixture(f);

    b.SetUserData(this);

    this.die = function(){
      b.SetActive(false);
    }

    this.getBean = function(){
      return {type:this.type,id:this.id,type:this.type,x:this.x,y:this.y,w:this.w,content:this.content,isOpen:this.isOpen};
    }

    this.open = function(){
      this.isOpen = true;
    }
  }

  function Teacher(world,id,x,y){
    this.type = 'teacher';
    this.id = id;
    this.socket = room.getSocketByID(id);
    this.active = true;
    this.new = true;
    this.x = x;
    this.y = y;

    this.getBean = function(){
      return {type:this.type,id:this.id,x:this.x,y:this.y,active:this.active};
    }

    this.die = function(){

    }

    this.step = function(){
      if(this.targetX) this.x = (this.x*5+this.targetX)/6;
      if(this.targetY) this.y = (this.y*5+this.targetY)/6;
    }

    this.socket.on('target',onTarget.bind(this));

    function onTarget(x,y){
      this.targetX = x;
      this.targetY = y;
    }
  }

  function Player(world,id,n,x,y){

    var GROUP_PLAYER = 2;
    var GRAVITY = 3;
    var JUMP = 26;
    var SPEED = 10;
    var BUFFER = 0.5;

    this.type = 'player';
    this.id = id;
    this.socket = room.getSocketByID(id);
    this.active = false;
    this.body = world.makePlayerBody(x,y);
    this.body.SetUserData(this);
    this.new = true;
    this.n = n;
    this.claimed = [];

    var v = this.body.GetLinearVelocity();
    var p = this.body.GetPosition();
    this.p = p;

    this.toString = function(){
      return 'Player'; 
    }

    this.reset = function(){
      v.x = 0;
      v.y = 0;
      this.targetX = undefined;
      this.targetY = undefined;
    }

    this.step = function(){
      
      var isOnGround = (cnt>0);
      this.state = 'standing';

      if(this.targetX != undefined){
        var difference = this.targetX-p.x;
        if(difference>BUFFER){
          v.x = SPEED;
          this.state = 'running';
        }
        else if(difference<-BUFFER){
          v.x = -SPEED;
          this.state = 'running';
        }
        else{
          v.x = difference*10;
        }
      } else {
        v.x *= 0.95;
      }

      if(this.jump){
        v.y = JUMP;
        this.jump = false;
      } else {
        v.y -= GRAVITY;
      }

      var cnt = 0;
      for(var plat in platforms) cnt++;
      if(cnt==0) this.state = 'jumping';

      
    }

    this.die = function(){
      this.body.SetActive(false);
    }

    this.getBean = function(){
      return {type:'player',id:this.id,x:p.x,y:p.y,active:this.active,state:this.state,n:this.n,claimed:this.claimed};
    }

    this.onChatToRoom = function(msg){
      room.toAll('chat-from-room',msg,actors[this.socket.id].getBean());
    }

    this.onJump = function(){
      var cnt = 0;
      for(var p in platforms) cnt++;
      if(cnt) this.jump = true;
    }

    this.onTarget = function(x,y){
      if(x<1) x = 1;
      if(x>99) x = 99;
      this.targetX = Math.round(x);
      //if(Math.abs(this.targetX-this.p.x)<5 && (y-this.p.y)>1) this.onJump();
      if((y-this.p.y)>1) this.onJump();
    }

    this.solve = function(other,c){
      if(other.type == 'platform' && v.y>0 || (other.y>this.p.y) ){
        c.SetEnabled(false);
      }
    }

    var platforms = [];

    this.touch = function(other,c){

      if(other.type == 'artefact' && other.n == this.n){
        this.socket.emit('artefact',other.content);
        this.targetX = other.x;
        this.claimed.push(other.getBean());
        this.onChatToRoom('Clue discovered!');
        other.markForRemoval = true;
      } else if(other.type == 'platform' && (other.y<p.y)){
        platforms[other.id] = other;
      } else if(other.type == 'player' && other.p.y<this.p.y){
        platforms[other.id] = other;
      } else if(other.type == 'door'){
        //this.die();
        this.socket.emit('door',other.content);
        this.targetX = other.x;
      }
    }

    this.untouch = function(other,c){
      if(other.type == 'platform'){
        delete platforms[other.id];
      } else if (other.type == 'player' && platforms[other.id]){
        delete platforms[other.id];
      }
    }

    this.onAttempt = function(isCorrect){
      if(isCorrect){
        this.onChatToRoom('Puzzle solved!');
        room.toAll('victory');
        theDoor.open();
      }
    }

    this.socket.on('target',this.onTarget.bind(this));
    this.socket.on('jump',this.onJump.bind(this));
    this.socket.on('chat-to-room',this.onChatToRoom.bind(this));
    this.socket.on('attempt',this.onAttempt.bind(this));
    this.socket.on('reset',onReset.bind(this));
  }

  var W = 100;
  var H = 30;

  makePlatform(W/2,0,W); 
  makePlatform(5,6,10); 
  makePlatform(15,12,10); 
  makePlatform(25,18,10); 
  makePlatform(25,26,10); 

  makePlatform(45,6,10); 
  makePlatform(55,12,10); 
  makePlatform(65,20,10); 
  makePlatform(75,12,10); 

  // put these at the same coordinates as the platforms to make them float in the middle of said platform
  makeArtefact(5,6,{type:'video',html:"<video width=720 height=480 autoplay controls src='./content/pizza-anim.mp4'></video>"});
  makeArtefact(15,12,{type:'scrap',html:"<img src='./content/pizza-menu.png'>"});
  makeArtefact(25,18,{type:'scrap',html:"<img src='./content/pizza-menu-bottom.png'>"});
  makeArtefact(25,26,{type:'tool',subtype:"measuring",img:'./content/pizza-small.png',width:9});

  makeArtefact(45,6,{type:'tool',subtype:"measuring",img:'./content/pizza-medium.png',width:12});
  makeArtefact(55,12,{type:'tool',subtype:"measuring",img:'./content/pizza-large.png',width:15});
  makeArtefact(65,20,{type:'book',html:"<img src='./content/little-book-of-circles.png'>"});
  makeArtefact(75,12,{type:'tool',html:'<iframe width="219" height="302" src="http://www.calculator-1.com/outdoor/?f=ffffff&r=ffffff" scrolling="no" frameborder="0"></iframe>'});

  makeDoor(90,0,[{type:'input',target:1},'&nbsp;Small Pizzas<br>',{type:'input',target:0},'&nbsp;Medium Pizzas<br>',{type:'input',target:2},'&nbsp;Large Pizzas<br>'])

  makeHint('There is only one flavour of pizza.');
  makeHint('You should try and buy as much pizza as you can with your money.');
  makeHint('Is it better to buy big pizzas or little pizzas?');

  iTicker = setInterval(tick,1000/20);  
}