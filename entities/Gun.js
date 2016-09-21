var Gun = function(game, owner) {
	Entity.call(this, game, owner.x, owner.y);
	this.game = game;
	this.owner = owner;
	this.px = 0;
	this.scale = 2.5;

	this.sprite = new Sprite(game, game.assetManager.assets.gun, 9, 3);
	this.sprite.addAnimation(new Animation(game, 'gunr', [[0, 0], [0, 1]], 20));
	this.sprite.addAnimation(new Animation(game, 'gunl', [[1, 0], [1, 1]], 20));
	this.sprite.setAnimation("gunr")
	
};

Gun.prototype = Object.create(Entity.prototype);

Gun.prototype.update = function(dt) {
	Entity.prototype.update.call(this, dt)
	this.x = this.owner.x;
	this.y = this.owner.y;

	var m = this.game.mouse;

	var dx = m.x - this.x;
	var dy = m.y - this.y;

	this.angle = Math.atan2(dy, dx);

	var a = this.angle * 180 / Math.PI;
	if(a > 90 || a < -90) {
		this.sprite.setAnimation("gunl");
		this.owner.mirror = true;
	} else {
		this.sprite.setAnimation("gunr");
		this.owner.mirror = false;
	}
};

