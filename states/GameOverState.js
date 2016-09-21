var GameOverState = function(game, data) {
	this.game = game;
	this.data = data;

	this.buttons = {
		start: {
			text: "PLAY AGAIN",
			fontSize: "20px",
			rx: game.screen.hw - 75,
			ry: 300,
			w: 150,
			h: 30,
			scale: 1,
			hitbox: {
				offsetX: 0,
				offsetY: 0,
				w: 150,
				h: 30
			}
		},
		menu: {
			text: "MENU",
			fontSize: "20px",
			rx: game.screen.hw - 75,
			ry: 350,
			w: 150,
			h: 30,
			scale: 1,
			hitbox: {
				offsetX: 0,
				offsetY: 0,
				w: 150,
				h: 30
			}
		}
	}

	var self = this;
	game.mouse.onClick(function(x, y) {
		if(game.hasCollision({rx: x, ry: y, scale: 1, hitbox: {offsetX: 0, offsetY:0, w: 2, h: 2}}, self.buttons.start)) {
			game.startState("play");
		} else if(game.hasCollision({rx: x, ry: y, scale: 1, hitbox: {offsetX: 0, offsetY:0, w: 2, h: 2}}, self.buttons.menu)) {
			game.startState("menu");
		}
	});
};

GameOverState.prototype.update = function() {};

GameOverState.prototype.draw = function(ctx) {
	ctx.fillStyle = "white"
	ctx.fillRect(0,0,1000,1000);

	this.game.renderer.drawText("Game Over", this.game.screen.hw + 2 - Math.random() * 4, 100+ 2 - Math.random() * 4, {
		fontSize: "60px",
		textAlign: "center"
	});

	this.game.renderer.drawText("score: " + this.data , this.game.screen.hw, 200, {
		fontSize: "28px",
		textAlign: "center"
	});

	var b;
	for(var i in this.buttons) {
		b = this.buttons[i];
		this.game.renderer.drawButton(b.text, b.fontSize, b.rx, b.ry, b.w, b.h)
	}
};



