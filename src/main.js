/**
 * Copyright(r) 2014 Klaudia Siarnik
 */
var surface = new gCanvas(document.getElementById("main_canvas"));
var ctx 	= surface.ctx;

/** Konfiguracja jest stała zaś stan zmienny */
var engine_config = {
	BACKGROUND_COLOR	:	gColor.BLACK,
	APP_STATE			:	{ 
		SPLASH 	: 	1,
		MENU	:	2,
		GAME	:	3,
		SCORE	:	4
							},
	MAX_SOUND_VOLUME	:	10,
	CELL_SIZE			:	new Vec2(32, 32),
	TOP_BAR_HEIGHT		:	64,
	DEBUG				:	true,
	BRICKS_IN_LIST		:	2,
	LOADED				:	false
};
var app_state = {
	screen		:	engine_config.APP_STATE["GAME"],
	sound_level	:	engine_config.MAX_SOUND_VOLUME / 2	
};
var keycodes = {
	SPACE		:	32,
	F			:	70,
	S			:	83,
	LEFT		:	65,
	RIGHT		:	68,
	BACKSPACE	:	8
};
var level = {
	VELOCITY	:	2,
	SCORE		:	0,
	LINES		:	0
};

/** Zasoby gry - [nazwa, wielkosc kafla] */
var content = {
	sheet_textures		: 	[ './resources/sprites_small.png', engine_config.CELL_SIZE ],
};
for(key in content)
	content[key][0] = ContentManager.registerImage(content[key][0]);
ContentManager.registerLoadCallback(onCreate);
function onCreate() {
	// Transformacja obrazów na tile
	for(key in content)
		if(content[key][1] == null)
			continue;
		else
			content[key] = new gTile(content[key][0], content[key][1]);
	mapInit();
	engine_config.LOADED = true;
}

/** Gameplay */
function BrickTemplate(size, template, margin) {
	this.size		=	size;
	this.template	=	template;
	this.margin		=	margin;
	
	this.copy	=	function(template) {
		this.template	=	template.template;
		this.size.copy(template.size);
		this.margin.copy(template.margin);
	}
}

var BRICK_COLOR = {
	EMPTY	:	0,
	BLUE	:	1,
	RED		:	2,
	GREEN	:	3,
	ORANGE	:	4,
	PURPLE	:	5
};
var BRICKS = {
	O	:	new BrickTemplate(
				new Vec2(2, 2), // wysokosc
				[
					[ 	1,	1	],
					[ 	1,	1	],
				],
				new Rect(0, 0, 0, 0)), // margines zgodnie z ruchem zegara
	
	T	:	new BrickTemplate(
				new Vec2(3, 3),
				[
					[ 	1,	1,	1	],
					[ 	0,	1,	0	],
					[	0,	0,	0	]
				],
				new Rect(0, 0, 0, 1)),
	
	U	:	new BrickTemplate(
				new Vec2(3, 3),
				[
					[ 	0,	0,	0	],
					[ 	0,	1,	0	],
					[	1,	1,	1	]
				],
				new Rect(0, 1, 0, 0)),
	
	S	:	new BrickTemplate(
				new Vec2(3, 3),
				[
					[ 	0,	1,	1	],
					[ 	1,	1,	0	],
					[	0,	0,	0	]
				],
				new Rect(0, 0, 0, 1)),
	
	Z	:	new BrickTemplate(
				new Vec2(3, 3),
				[
					[ 	1,	1,	0	],
					[ 	0,	1,	1	],
					[	0,	0,	0	]
				],
				new Rect(0, 0, 0, 1)),
				
	I	:	new BrickTemplate(
				new Vec2(3, 3),
				[
					[ 	0,	1,	0	],
					[ 	0,	1,	0	],
					[	0,	1,	0	]
				],
				new Rect(1, 0, 1, 0)),
				
	L	:	new BrickTemplate(
				new Vec2(3, 3),
				[
					[ 	0,	1,	0	],
					[ 	0,	1,	0	],
					[	0,	1,	1	]
				],
				new Rect(1, 0, 0, 0)),
	
	J	:	new BrickTemplate(
				new Vec2(3, 3),
				[
					[ 	0,	1,	0	],
					[ 	0,	1,	0	],
					[	1,	1,	0	]
				],
				new Rect(0, 0, 1, 0)),
};

function Brick(game, pos, template) {
	var self 		= 	this;
	this.game		=	game;
	
	this.color		=	getRandom(BRICK_COLOR.BLUE, BRICK_COLOR.PURPLE);
	this.boxes		=	[	];
	this.template	=	null;
	this.bounds		=	new Rect(pos.X, pos.Y, 
								engine_config.CELL_SIZE.X, 
								engine_config.CELL_SIZE.Y);
	this.run		=	false;
	
	// Zmiana szablonu klocka
	this.genBounds = function(template) {
		return new Rect(	this.bounds.X,	this.bounds.Y,
							template.size.X * engine_config.CELL_SIZE.X,
							template.size.Y * engine_config.CELL_SIZE.Y);
	}
	this.calcBounds = function(template) {
		this.bounds.copy(this.genBounds(template));
	}
	this.refreshTemplate = function() {
		this.changeTemplate(this.template);
	}
	this.changeTemplate = function(template) {
		var sheet = template.template;
		
		this.template	=	template;
		this.boxes 		= 	[ ];
		for(var i = 0;i < this.template.size.Y;++i)
			for(var j = 0;j < this.template.size.X;++j)
				if(sheet[i][j] == 1)
					this.boxes.push(new Rect(
								j * engine_config.CELL_SIZE.X, 
								i * engine_config.CELL_SIZE.Y, 
								engine_config.CELL_SIZE.X, 
								engine_config.CELL_SIZE.Y));
		this.calcBounds(template);
	}
	this.changeTemplate(template);
	
	// Poruszanie klocka
	this.move_tween		=	null;
	this.move	= function(dir) {
		if(this.isTweenBlock(this.rotate_tween) ||
			this.isTweenBlock(this.move_tween))
			return;
		
		var w = engine_config.CELL_SIZE.X;
		var after_move = this.bounds.X + w * dir;
		if(this.checkCollsWithPos(new Vec2(after_move  + 
									(dir < 0 ? w * this.template.margin.X : w * -this.template.margin.W), 
									this.bounds.Y)))
				return;
		
		this.move_tween = Tweener.registerTween(
							{ pos	:	this.bounds.X }, 
							{ pos	:	after_move }, 
							.1,
							function(t_handle) {
								// przy skonczeniu
							},
							function(t_handle) {
								// przy aktualizacji
								self.bounds.X = self.move_tween.obj.pos;
							});
	}
	
	// Obracanie klocka
	this.rotate_tween	=	null;
	
	this.isOutSideTheBorder = function() {
		if(this.bounds.X + this.template.margin.X * engine_config.CELL_SIZE.X < 0) 
			return DIR.LEFT;
		else if(this.bounds.X + this.bounds.W - this.template.margin.W * engine_config.CELL_SIZE.X 
												> this.game.bounds.W)
			return DIR.RIGHT;
		return -1;
	}
	this.resetToBorder = function() {
		var dir = this.isOutSideTheBorder();
		if(dir == DIR.LEFT)
			this.bounds.X	= 0;
		else if(dir == DIR.RIGHT)
			this.bounds.X	= this.game.bounds.W - engine_config.CELL_SIZE.X * this.template.size.X;
	}
	this.rotate	= function() {
		// Klocek nie porusza się w czasie animacji
		if(this.isTweenBlock(this.rotate_tween))
			return;
				
		// Rotacja tablicy 90*
		// po pełnym obróconym zmieniany jest szablon
		var temp_template = [ ];
		for(var i = 0;i < this.template.size.Y;++i)
			for(var j = 0;j < this.template.size.X;++j) {
				if(!isSet(temp_template[j]))
					temp_template[j] = [ ];
				temp_template[j][i] = this.template.template[this.template.size.Y - i - 1][j];
			}
		
		// Przesuwa do środka planszy jak wyjdzie
		this.resetToBorder();
		
		this.template.margin.moveClockwiseParams();
		this.template.size.swap();
		this.template.template = temp_template;
		
		// Rotacja obrazka
		var angle = !isSet(this.rotate_tween) ? toRad(0) : this.rotate_tween.obj.rotation;
		this.rotate_tween = Tweener.registerTween(
							{ rotation	:	angle }, 
							{ rotation	:	angle + toRad(90) }, 
							.05,
							function(t_handle) {
								self.changeTemplate(self.template);
								self.rotate_tween.obj.rotation = toRad(0);
							});
					
	}
	
	// NAJWOLNIEJSZA METODA W GRZEE!!!
	// Czy klocek koliduje z czymś
	this.intersect = function(map_x, map_y) {
		if(this.game.sheet[map_y][map_x] == BRICK_COLOR.EMPTY)
			return false;
		
		var rect_1 = new Rect(0, 0, 0, 0);
		var rect_2 = new Rect(
					map_x * engine_config.CELL_SIZE.X,
					map_y * engine_config.CELL_SIZE.Y,
					engine_config.CELL_SIZE.X, 
					engine_config.CELL_SIZE.Y);
		for(var k in this.boxes) {
			rect_1.copy(this.boxes[k]);
			rect_1.Y += this.bounds.Y;
			rect_1.X += this.bounds.X;
			
			if(rect_1.intersect(rect_2))
				return true;
		}
		return false;
	}
	this.checkCollsWithPos = function(vec) {
		var temp = new Vec2(this.bounds.X, this.bounds.Y);
		
		this.bounds.X = vec.X;
		this.bounds.Y = vec.Y;
		
		var colls = this.checkCollisions();
		
		this.bounds.X = temp.X;
		this.bounds.Y = temp.Y;
		
		return colls;
	}
	this.checkCollisions = function() {
		for(var k in this.boxes) {
			var box = new Rect(0, 0, 0, 0);
			box.copy(this.boxes[k]);
			
			box.Y += this.bounds.Y;
			box.X += this.bounds.X;
			
			if(!this.game.bounds.contains(box))
				return true;
			
			for(var i = 0;i < this.game.sheet_size.X;++i)
				for(var j = 0;j < this.game.sheet_size.Y;++j)
					if(this.intersect(i, j))
						return true;
		}
		return false;
	}
	
	this.isTweenBlock = function(tween) {
		return Boolean(isSet(tween) && !tween.done);
	},
	this.update	=	function() {
		if(this.isTweenBlock(this.rotate_tween) || 
				(isSet(this.game.move_line_tween) && 
					this.game.move_line_tween.proc > 0 && 
					this.game.move_line_tween.proc < .17))
			return;
		
		if(this.checkCollisions())
			if(this.bounds.Y <= 10)
				this.game.gameOver();
			else {
				if(this.isOutSideTheBorder() != -1)
					this.resetToBorder();
				else 
					this.game.putBrick(this);
			}
		else if(this.run)
			this.bounds.Y += level.VELOCITY;
	}
	
	// Rysowanie klocka
	this.drawBoxes = function() {
		this.boxes.forEach(function(entry) {
			Images.drawCanvas(
						content.sheet_textures.getImage(self.color, 0), 
						surface, 
						entry);
		});
	}
	this.draw = function(x, y) {
		ctx.save();
		if(isSet(x))
			ctx.translate(x, y);
		else {
			ctx.translate(
						this.bounds.X + this.bounds.W / 2, 
						this.bounds.Y + this.bounds.H / 2);
			ctx.rotate(this.rotate_tween == null ? 0 : this.rotate_tween.obj.rotation);
			ctx.translate(
						-this.bounds.W / 2, 
						-this.bounds.H / 2);
		}
		this.drawBoxes();
		ctx.restore();
	}
}
var game = {
	sheet_size	:	new Vec2(10, 15),
	sheet		:	[ ],
	bounds		:	new Rect(0, 0, 
							10 * engine_config.CELL_SIZE.X, 
							15 * engine_config.CELL_SIZE.Y),
	moving_brick	:	null,
	next_bricks		:	[ ],
	
	game_over_tween	:	null,
	gameOver		:	function() {
		if(isSet(this.game_over_tween))
			return;
		this.game_over_tween = Tweener.registerTween(
								{ alpha	:	0. }, 
								{ alpha	:	.7 }, 
								.01);
	},
	reset			:	function() {
		var self = this;
		this.game_over_tween = Tweener.registerTween(
								{ alpha	:	.7 }, 
								{ alpha	:	.0 }, 
								.01,
								function(k) {
									// na koncu tweena
								},
								function(k) {
									if(k.proc != .2900000000000001)
										return false;
									
									self.game_over_tween = null;
									self.create();
									
									level.SCORE = level.LINES = 0;
									level.VELOCITY = 2;
								});
	},
	
	// 1 param gCanvas, 2 pozycja y
	empty_lines		:	[ ],
	move_line_tween	:	null,
	line_collapsed	:	false,
	
	generateBrickList	:	function() {
		for(var i = this.next_bricks.length;i < engine_config.BRICKS_IN_LIST;++i)
			this.next_bricks.push(this.getRandomBrick());
	},
	putBrick	:	function(brick) {
		brick.bounds.X = parseInt(parseInt(brick.bounds.X) / engine_config.CELL_SIZE.X)
							* engine_config.CELL_SIZE.X;
		brick.bounds.Y = parseInt(parseInt(brick.bounds.Y) / engine_config.CELL_SIZE.Y) 
							* engine_config.CELL_SIZE.Y;
		for(var k in brick.boxes) {
			var box = brick.boxes[k];
			
			box.X += brick.bounds.X;
			box.Y += brick.bounds.Y;
			
			this.sheet[box.Y / engine_config.CELL_SIZE.Y][box.X / engine_config.CELL_SIZE.X] 
															= brick.color;
		}
		this.resetBrick();
		this.checkLines();
	},
	checkLines	:	function() {
		var score_ac = 0;
		this.empty_lines = [ ];
		for(var i = 0;i < this.sheet_size.Y;++i) {
			var is_full = true;
			for(var j = 0;j < this.sheet_size.X;++j)
				if(this.sheet[i][j] == BRICK_COLOR.EMPTY) {
					is_full = false;
					break;
				}
			// Jeśli jest pełna to.. 
			if(is_full) {
				// Prerenderuj do tekstury
				// o wymiarach jednego paska i wysuń
				var canvas = new gCanvas(
										document.createElement('canvas'), 
										new Rect(0, 0, 
											this.bounds.W, 
											engine_config.CELL_SIZE.Y));
				for(var j = 0;j < this.sheet_size.X;++j) {
					Images.drawCanvas(content.sheet_textures.getImage(this.sheet[i][j], 0), 
							canvas, 
							new Vec2(
									j * engine_config.CELL_SIZE.X,
									0));
					this.sheet[i][j] = BRICK_COLOR.EMPTY;
				}
				
				this.empty_lines.push(canvas);
				this.empty_lines.push(i * engine_config.CELL_SIZE.Y);
				
				score_ac++;
			}
		}
		// Rejestruje animacje
		if(score_ac != 0) {
			var self = this;
			if(isSet(this.move_line_tween) && !this.move_line_tween.done)
				this.moveLinesDown(self.empty_lines[i+1] / engine_config.CELL_SIZE.Y);
			else
				this.move_line_tween = Tweener.registerTween(
							{ pos	:	0 }, 
							{ pos	:   this.bounds.W }, 
							.01,
							function(t_handle) { 
								self.empty_lines = [ ];
								self.line_collapsed = false;
							},
							function(t_handle) {
								if(t_handle.proc >= .2 && !self.line_collapsed) {
									for(var i = 0;i < self.empty_lines.length;i+=2)
										self.moveLinesDown(self.empty_lines[i+1] / engine_config.CELL_SIZE.Y);
									self.line_collapsed = true;
								}
							});
		}
	},
	moveLinesDown : function(index) {
		for(var i = 0;i < this.sheet_size.X;++i)
			for(var j = index;j >= 0;--j)
				this.sheet[j][i] = (j <= 0 ? BRICK_COLOR.EMPTY : this.sheet[j - 1][i]);
		
		level.VELOCITY *= 1.1;
		level.SCORE	+= 100 + level.SCORE * 0.2;
		level.LINES++;
	},
	
	// Tworzenie i aktualizacja stanu gry
	getRandomBrick	:	function() {
		var keys = Object.keys(BRICKS);
		return	new Brick(
						this, 
						new Vec2(3 * engine_config.CELL_SIZE.X, 0), 
						BRICKS[keys[getRandom(0, keys.length - 1)]]);
	},
	resetBrick 		: 	function() {
		var old = isSet(this.moving_brick);
		
		this.moving_brick = this.next_bricks.shift();
		this.moving_brick.refreshTemplate();
		this.moving_brick.run = old;
		
		this.next_bricks.push(this.getRandomBrick());
	},
	create		:	function() {
		this.sheet = [ ];
		for(var i = 0;i < this.sheet_size.Y;++i) {
			this.sheet[i] = [ ];
			for(var j = 0;j < this.sheet_size.X;++j)
				this.sheet[i].push(BRICK_COLOR.EMPTY);
		}
		
		this.generateBrickList();
		this.resetBrick();
	},
	update	:	function() {
		this.moving_brick.update();
	},
	
	// Rysowanie
	drawSheet	:	function() {
		for(var i = 0;i < this.sheet_size.X;++i)
			for(var j = 0;j < this.sheet_size.Y;++j)
				Images.drawCanvas(
						content.sheet_textures.getImage(this.sheet[j][i], 0), 
						surface, 
						new Vec2(
								i * engine_config.CELL_SIZE.X,
								j * engine_config.CELL_SIZE.X));
				
		// Rysowanie animacji wysuwania
		for(var i = 0;i < this.empty_lines.length;i+=2)
			Images.drawCanvas(
						this.empty_lines[i], 
						surface, 
						new Vec2(
								this.move_line_tween.obj.pos,
								this.empty_lines[i + 1]));
	},
	draw	:	function() {
		this.drawSheet();
		this.moving_brick.draw();
		
		if(isSet(this.game_over_tween) && this.game_over_tween.obj.alpha >= .2) {
			Primitives.fillRect(ctx,
						this.bounds,
						new gColor(0, 0, 0, this.game_over_tween.obj.alpha));
			
			Primitives.printText(surface.ctx, 
								40, 
								200, 
								"Przegrales!", 
								25, 
								new gColor(255, 255, 255, this.game_over_tween.obj.alpha + .5), 
								false);
			Primitives.printText(surface.ctx, 
								50, 
								240, 
								"[ F ] reset", 
								20, 
								new gColor(255, 255, 255, this.game_over_tween.obj.alpha + .5), 
								false);
		}
	}
};

function mapInit() {
	game.create();
}
function keyPress(event) {
	var key = event.keyCode;
	
	game.moving_brick.run = true;
	switch(key) {
		case keycodes.LEFT:
			game.moving_brick.move(-1);
		break;
		
		case keycodes.RIGHT:
			game.moving_brick.move(1);
		break;
		
		case keycodes.S:
			game.moving_brick.rotate();
		break;
		
		case keycodes.F:
			game.reset();
		break;
	};
}

/** Nie potrzeba separacji update od draw */
function drawUI() {
	// Tło interfejsu
	Primitives.fillRect(ctx,
						new Rect(game.bounds.W, 0, surface.bounds.W - game.bounds.W, surface.bounds.H),
						engine_config.BACKGROUND_COLOR);
	
	Primitives.printText(surface.ctx, 0, 19, "JS_Tetris", 19, gColor.WHITE, false);
	Primitives.printText(surface.ctx, 210, 19, "klaudia siarnik", 10, gColor.RED, false);
	
	ctx.save();
	ctx.translate(game.bounds.W + 10, 0);
	
	Primitives.printText(surface.ctx, 0, 100, "Punkty:", 20, gColor.WHITE, false);
	Primitives.printText(surface.ctx, 0, 130, parseInt(level.SCORE) + "pkt", 25, gColor.BLUE, false);
	
	Primitives.printText(surface.ctx, 0, 190, "Linie:", 20, gColor.GRAY, false);
	Primitives.printText(surface.ctx, 0, 220, parseInt(level.LINES), 25, gColor.RED, false);
	
	Primitives.printText(surface.ctx, 0, 280, "Dalej:", 20, gColor.WHITE, false);
	
	
	for(var i = 0;i < game.next_bricks.length;++i) {
		ctx.save();
		ctx.translate(0, 300);
		if(i != 0)
			ctx.scale(.75, .75);
		else
			ctx.scale(1.1, 1.1);
		
		game.next_bricks[i].draw(0, (i == 0 ? 0 : 50) + i * 100);
		ctx.restore();
	}
	ctx.restore();
	
	Primitives.fillRect(ctx,
						new Rect(0, game.bounds.H + 20, surface.bounds.W, 40),
						engine_config.BACKGROUND_COLOR);
	Primitives.printText(surface.ctx, 
								0, 
								game.bounds.H + 40, 
								"[A] lewo [D] prawo [S] obrot [F] reset", 
								13, 
								gColor.GRAY, 
								false);
}
function draw() {
	if(!engine_config.LOADED)
		return;
	ctx.clearRect(0, 0, surface.bounds.W, surface.bounds.H);
	Primitives.drawRect(ctx, 
						surface.bounds, 
						engine_config.BACKGROUND_COLOR);	
	ctx.save();
	ctx.translate(0, 20);
	game.draw();
	game.update();
	ctx.restore();
	
	drawUI();
	
	Tweener.update();
}
setInterval(draw, 1000 / 40);


