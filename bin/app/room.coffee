Dispatcher = require('./dispatcher')

module.exports = class Room extends Dispatcher

  constructor:(@bean,io)->
    super()

    GameEngine = require './games/'+bean.type
    game = new GameEngine @
  
  join:(socket)->
    socket.join @bean.id,()->
      socket.emit 'in-room',@bean
    .bind(@)

	getSockets:()->
		if @io.sockets.adapter.rooms[bean.id]
			return @io.sockets.adapter.rooms[bean.id].sockets

	getSocketByID:(id)->
		return @io.sockets.sockets[id]

  event:(socket,type,info)->
  	socket.to(@bean.id).emit(type,info)

  toAll:(type,a,b,c)->
  	io.to(@bean.id).emit(type,a,b,c)