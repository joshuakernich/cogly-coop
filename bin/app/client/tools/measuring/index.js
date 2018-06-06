define([], function() {

    return function MeasuringTool(data){

        var incSize = 15;
        var incCount = 20;

    	var $el = this.$el = $('<div class="measuring-tool">');

        if(data.img){
            var $img = $('<img src="'+data.img+'">').appendTo($el);
            $img.css({width:incSize*data.width});
        }

    	var ruler = new Ruler();
        ruler.$el.appendTo($el);


    	function Ruler(){
    		var $el = this.$el = $('<div class="ruler">');
    		
    		$el.on('mousedown',onDrag);

            function onDrag(e){
                e.preventDefault();
                $('body').on('mousemove',onMove);
                $('body').on('mouseup',onDrop);
            }

            function onMove(e){
                e.preventDefault();
                $el.offset({left:e.pageX,top:e.pageY});
            }

            function onDrop(e){
               $('body').off('mousemove',onMove);
                $('body').off('mouseup',onDrop); 
            }

    		for(var i=0; i<=(incCount+1); i++){
    			var $elInc = $('<div class="ruler-increment">').appendTo($el);
                $elInc.width(incSize);
    			$('<div class="ruler-number">').appendTo($elInc).html(i);
                if(i>incCount) $elInc.css({opacity:0})
    		}
    	}

    }
})