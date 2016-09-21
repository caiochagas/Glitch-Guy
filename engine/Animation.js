var Animation = function(game, name, frames, speed) {
	this.game = game;
	this.name = name;
	this.frames = frames;
	this.speed = speed || null;
	this.frameCount = 0;
	this.timeToAnimate = speed;
};

Animation.prototype.update = function(dt) {
	if (!this.speed) return;
	if(this.timeToAnimate <= 0) {
		this.addFrame();
		this.timeToAnimate = this.speed;
	}else {
		this.timeToAnimate -= dt * 1000;
	}
};

 Animation.prototype.addFrame = function() {
	(this.frameCount < this.frames.length - 1) ? this.frameCount++ : this.frameCount = 0;
};

 Animation.prototype.getCurrentFrame = function() {
 	return this.frames[this.frameCount];
};
