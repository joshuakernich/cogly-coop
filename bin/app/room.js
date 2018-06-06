module.exports = function(bean,io){

	var self = this;
	this.bean = bean;
	this.mapSocket = {};

	this.getSockets = function(){
		if(io.sockets.adapter.rooms[bean.id]){
			return io.sockets.adapter.rooms[bean.id].sockets
		}
	}

	this.getSocketByID = function(id){
		return io.sockets.sockets[id]
	}

	this.join = function(socket,isTeacher){
		this.mapSocket[socket.id] = isTeacher;
		socket.join(bean.id,function(){
			socket.emit('room',bean);
			onJoinRoom();
		});
	}

	function onJoinRoom(){
      if(self.callbackChange) self.callbackChange();
    }

    function event(socket,type,info){
    	socket.to(bean.id).emit(type,info)
    }

    this.toAll = function(type,a,b,c){
    	io.to(bean.id).emit(type,a,b,c)
    }

    var Engine = require('./games/'+bean.type);
	var engine = new Engine(this);
}