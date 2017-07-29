var MenuState = function(game) {
	this.game = game;
	var self = this;

	this.buttons = {
		start: {
			text: "STAT",
			fontSize: "20px",
			rx: self.game.screen.hw - 75,
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
		}
	}

	game.mouse.onClick(function(x, y) {
		if(self.game.hasCollision({rx: x, ry: y, scale: 1, hitbox: {offsetX: 0, offsetY:0, w: 2, h: 2}}, self.buttons.start)) {
			self.game.startState("play");
		}
	});
};

MenuState.prototype.update = function() {};	

MenuState.prototype.draw = function(ctx) {
	ctx.fillStyle = "white"
	ctx.fillRect(0,0,1000,1000);

	this.game.renderer.drawText("> protect the core glitch from the evil robots", this.game.screen.hw, 170, {
		fontSize: "18px",
		textAlign: "center"
	});

	this.game.renderer.drawText("> use the glitch gun to kill the evil robots", this.game.screen.hw, 200, {
		fontSize: "18px",
		textAlign: "center"
	});


	this.game.renderer.drawText("> [W, A, S, D] or arrow keys to move", this.game.screen.hw, 230, {
		fontSize: "18px",
		textAlign: "center"
	});

	this.game.renderer.drawText("> mouse to aim and shoot", this.game.screen.hw, 260, {
		fontSize: "18px",
		textAlign: "center"
	});

	this.game.renderer.drawText("Glitch Guy", this.game.screen.hw + 2 - Math.random() * 4, 100 + 2 - Math.random() * 4, {
		fontSize: "60px",
		textAlign: "center"
	});

	var b;
	for(var i in this.buttons) {
		b = this.buttons[i];
		this.game.renderer.drawButton(b.text, b.fontSize, b.rx, b.ry, b.w, b.h)
	}
};



