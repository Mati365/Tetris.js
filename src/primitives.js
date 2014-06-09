/** Kolory to gColor */
var Primitives = {
	printText : function(ctx, x, y, text, size, color, center) {
		ctx.fillStyle = color.toString();
		ctx.font = "bold " + size + "px Joystix";
		ctx.fillText(text, 
				isSet(center) && center ? 
						(surface.bounds.W / 2 - ctx.measureText(text).width / 2) 
						: x, 
					y);
	},
	drawRect : function(ctx, rect, fill_color, stroke_color, stroke) {
		if(isSet(fill_color)) {
			ctx.fillStyle = fill_color.toString();
			ctx.fillRect(rect.X, rect.Y, rect.W, rect.H);
		}
		if(isSet(stroke_color)) {
			ctx.beginPath();
			ctx.rect(rect.X, rect.Y, rect.W, rect.H);
			ctx.lineWidth = stroke;
			ctx.strokeStyle = stroke_color.toString();
			ctx.closePath();
			ctx.stroke();
		}
	},
	fillRect : function(ctx, rect, color) { 
		ctx.fillStyle = color.toString();
		ctx.fillRect(rect.X, rect.Y, rect.W, rect.H);
	},
	drawLine : function(ctx, begin, end, color, stroke) {
		ctx.beginPath();
		ctx.lineWidth = stroke;
		ctx.strokeStyle = color.toString();
		ctx.moveTo(begin.X, begin.Y);
		ctx.lineTo(end.X, end.Y);
		ctx.closePath();
		ctx.stroke();
	},
};
var Images = { 
	drawCanvas : function(source, destination, pos) {
		var ctx = destination.ctx;
		if(source instanceof gCanvas)
			ctx.drawImage(
					source.canvas, 
					pos.X, 
					pos.Y, 
					source.bounds.W, 
					source.bounds.H);
		else if(source instanceof Image)
			ctx.drawImage(
					source, 
					pos.X, 
					pos.Y);
		else
			ctx.putImageData(
					source, 
					pos.X, 
					pos.Y);
	},
	drawCutCanvas : function(source, destination, pos, bounds, inner_pos, inner_bounds) {
		destination.ctx.drawImage(
					source.canvas, 
					inner_pos.X,
					inner_pos.Y,
					inner_bounds.W,
					inner_bounds.H,
					pos.X, 
					pos.Y, 
					bounds.W, 
					bounds.H);
	},
	drawRotatedCanvas : function(source, destination, pos, angle, center) {
		var	ctx	=	destination.ctx;
		
		ctx.save();
		ctx.translate(pos.X, pos.Y);
		ctx.translate(center.X, center.Y);
		ctx.rotate(toRad(angle));
		ctx.translate(-center.X, -center.Y);
		
		drawCanvas(source, destination, Vec2.zero);
		
		ctx.restore();
	}
};
