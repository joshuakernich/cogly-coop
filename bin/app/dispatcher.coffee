
class Dispatcher

  constructor:()->
    @map = {}

  on:(e,fn)->
    
    if(!@map[e]) @map[e] = []
    @map[e].push(fn)
  
  trigger:(e,data)->
    for(i in @map[e]) @map[e][i](this,data)

module.exports = Dispatcher