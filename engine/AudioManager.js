var AudioManager = function(game) {
	this.game = game;
	this.sounds = {};
};

AudioManager.prototype.load = function(obj) {
	for(var i in obj) {
		this.sounds[i] =  jsfxr(obj[i]);
	}
};

AudioManager.prototype.play = function(name) {
	var player = new Audio();
	player.src = this.sounds[name];
	player.play();
};
