var Time = function(game) {
	this.game = game;
	this.lastDate = null;
	this.deltaTime = 0;
};

Time.prototype.update = function() {
	var now = Date.now();
	this.deltaTime = (now - this.lastDate) / 1000;
	this.lastDate = now;
};
