var Keyboard = function(game) {
	this.game = game;
	this.keys = {
		W: 87,
		A: 65,
		S: 83,
		D: 68,
		P: 80,
		LEFT: 37,
		UP: 38,
		RIGHT: 39,
		DOWN: 40
	};
	this.keysDown = [];

	var self = this;
	window.addEventListener('keydown', function(e) {
		var key = e.keyCode;
		if(key != 116 && key != 123) e.preventDefault();
		self.keysDown["k" + key] = true;
	});

	window.addEventListener('keyup', function(e) {
		var key = e.keyCode;
		if(key != 116 || key != 123) e.preventDefault();
		if(key == 80 &&  self.game.currentState instanceof PlayState) {
			self.game.pause = !self.game.pause;
			self.game.time.lastDate = Date.now();
		}
		delete self.keysDown["k" + key];
	});
};

Keyboard.prototype.isDown = function(key) {
	return ("k" + key in this.keysDown);
};


