var Sprite = function(game, image, w, h) {
	this.game = this;
	this.image = image,
	this.w = w;
	this.h = h;
	this.animations = {};
	this.animation = null;
};

Sprite.prototype.addAnimation = function(animation) {
	this.animations[animation.name] = animation;
};

Sprite.prototype.setAnimation = function(name) {
	var animation = this.animations[name];

	if(this.animation != animation) {
		this.animation = animation;
		animation.frameCount = 0;
	}
};
