/** Podstawowe klasy silniczka */
var DIR = {
	LEFT	:	new Vec2(-1, 0),
	RIGHT	:	new Vec2(1, 0),
	TOP		:	new Vec2(0, -1),
	BOTTOM	:	new Vec2(0, 1)
};

function negate(num) {
	return num == 0 ? 1 : 0;
}
function toRad(degrees) {
	return degrees * Math.PI / 180;
}
function toDeg(rad) {
	return rad * 180.0 / Math.PI;
}

function isSet(variable) {
	return typeof variable !== 'undefined' && variable != null;
}
function getRandom(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function Vec2(X,Y) {
	this.X	=	X;
	this.Y	=	Y;
	
	// Zamienia X z Y
	this.swap	=	function() {
		var t = this.X;
		this.X = this.Y;
		this.Y = t;
	}
	this.translate	=	function(v) {
		this.X += v.X;
		this.Y += v.Y;
	}
	this.getFromRectangle = function(rect) {
		this.X = rect.X;
		this.Y = rect.Y;
	}
	this.clear = function() {
		this.X = this.Y = 0;
	}
	this.copy = function(obj) {
		this.X = obj.X;
		this.Y = obj.Y;
	}
	this.moveTo = function(obj, v) {
		if(obj.X == this.X && obj.Y == this.Y)
			return true;
		
		this.X += (obj.X == this.X ? 0 : ((obj.X > this.X ? 1 : -1) * v));
		this.Y += (obj.Y == this.Y ? 0 : ((obj.Y > this.Y ? 1 : -1) * v));
		
		return false;
	}
}
Vec2.zero	=	new	Vec2(0, 0);

function Range(min, max) {
	this.min	=	min;
	this.max	=	max;
}
function Rect(X, Y, W, H) {
	this.X	=	X;
	this.Y	=	Y;
	this.W	=	W;
	this.H	=	H;
	
	// Przeusnięcie bitowe 0101 do 1010
	this.moveClockwiseParams = function() {
		var c = this.H;
		
		this.H = this.W;
		this.W = this.Y;
		this.Y = this.X;
		this.X = c;
	}
	this.copy = function(rect) {
		this.X = rect.X;
		this.Y = rect.Y;
		this.W = rect.W;
		this.H = rect.H;
	}
	this.intersect = function(rect) {
		return Boolean(
						this.X + this.W > rect.X && 
						this.X < rect.X + rect.W && 
						this.Y + this.H > rect.Y && 
						this.Y < rect.Y + rect.H);
	}
	this.contains = function(rect) {
		return Boolean(
						this.X <= rect.X && 
						this.X + this.W >= rect.X + rect.W && 
						this.Y <= rect.Y && 
						this.Y + this.H >= rect.Y + rect.H);
	}
	this.negate = function() {
		this.X = negate(this.X);
		this.Y = negate(this.Y);
		this.W = negate(this.W);
		this.H = negate(this.H);
	}
}
Rect.toRect	=	function(vec) {
	return new Rect(0, 0, vec.X, vec.Y);
}

function Timer(max, obj, callback) {
	this.tick		=	0;
	this.max		=	max;
	this.callback	=	callback;
	this.obj		=	obj;
	
	this.update	=	function() {
		this.tick++;
		if(this.tick > this.max) {
			if(this.obj == null)
				this.callback(this);
			else
				this.obj[callback](this);
		}
	}
}

/** 
 * Gówniana implementacja tweenów
 * Powinna być interfejs zwracający 
 * floaty w tablicy i je przyjmujący
 * Powinna byc tez interfejs funkcji
 * matematycznej ktory w procentach 
 * by liczyl obj+(obj-cel)*proc 
 */
var	TWEEN	=	{
	LINEAR		:	1
};
function Tween(obj, to_obj, v, callback, on_update) {
	if(obj.length != to_obj.length)
		throw "TWEEN OBJ ERROR!!";
	
	this.obj		=	obj;
	this.to_obj		=	to_obj;
	this.type		=	TWEEN.LINEAR;
	this.done		=	false;
	this.length		=	Object.keys(this.obj).length;
	
	this.v			=	v;
	this.proc		=	0.0;
	
	this.callback	=	callback;
	this.on_update	=	on_update;
	
	this.update	=	function() {
		this.proc += this.v;
		if(this.proc >= 1.0) {
			this.proc = 1.0;
			this.done = true;
		}
		for (var key in this.obj) {
			/** TODO: Różne typy tweenów */
			var _obj	=	this.obj[key];
			var	_to_obj	=	this.to_obj[key];
			
			if(this.done)
				_obj = _to_obj;
			else
				switch(this.type) {
					case TWEEN.LINEAR:
						_obj = _obj + (_to_obj - _obj) * this.proc;
					break;
				};
			this.obj[key]	=	_obj;
		}
		if(this.done && isSet(this.callback))
			this.callback(this);
		else if(isSet(this.on_update))
			this.on_update(this);
	}
}
var Tweener = {
	tweens			:	[	],
	
	registerTween	:	function(obj, to_obj, v, callback, on_update) {
		for(var i in this.tweens)
			if(this.tweens[i].obj == obj)
				this.tweens[i].done	=	true;
		
		var	tween	=	new Tween(obj, to_obj, v, callback, on_update);
		this.tweens.push(tween);
		
		return tween;
	},
	update	:	function() {
		for(var i = 0, l = this.tweens.length;i < l;) {
			var tween	=	this.tweens[i];
			if(tween.done || typeof tween == "undefined")
				this.tweens.splice(i, 1)
			else {
				tween.update();
				++i;
			}
		}
	}
}
