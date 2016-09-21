var Hero = function(game, x, y) {
	Entity.call(this, game, x, y);
	this.scale = 2.5;
	this.sprite = new Sprite(game, game.assetManager.assets.hero1, 7, 14);
	this.sprite.addAnimation(new Animation(game, 'idle', [[0, 0]]));
	this.sprite.addAnimation(new Animation(game, 'walking', [[0, 0], [0, 1], [0, 2]], 50));
	this.sprite.setAnimation("idle");
	this.setHitbox(0,0, this.sprite.w, this.sprite.h);
};

Hero.prototype = Object.create(Entity.prototype);

Hero.prototype.update = function(dt) {
	Entity.prototype.update.call(this, dt);

	this.speed += 0.5 * dt;

	var kb = this.game.keyboard;
	var sy = Math.abs(this.vy) / 2;
	var sx = Math.abs(this.vx) / 2;
	if(kb.isDown(kb.keys.A) || kb.isDown(kb.keys.LEFT)) {
		this.sprite.setAnimation("walking");
		this.vx = -this.speed + sy;
	} else if(kb.isDown(kb.keys.D) || kb.isDown(kb.keys.RIGHT)) {
		this.sprite.setAnimation("walking");
		this.vx = this.speed - sy;
	}else {
		this.vx = 0;
	}

	if(kb.isDown(kb.keys.W) || kb.isDown(kb.keys.UP)) {
		this.vy = -this.speed + sx;
		this.sprite.setAnimation("walking");
	} else if(kb.isDown(kb.keys.S) || kb.isDown(kb.keys.DOWN)) {
		this.vy = this.speed - sx;
		this.sprite.setAnimation("walking");
	}else {
		this.vy = 0;
	}

	if(this.vx == 0 && this.vy == 0) {
		this.sprite.setAnimation("idle");
	}
};

