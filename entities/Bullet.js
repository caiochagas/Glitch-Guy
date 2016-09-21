var Bullet = function(game, owner, angle) {
	Entity.call(this, game, owner.x, owner.y, 10, 5);
	this.owner = owner;
	this.angle = angle;
	this.speed = 500;
	
	this.scale = 4;
	this.sprite = new Sprite(game, game.assetManager.assets.bullet, 3, 2);
	this.sprite.addAnimation(new Animation(game, 'fire', [[0, 0], [0, 1], [0, 2], [0, 0], [0, 2], [0, 1]], 20));
	this.sprite.setAnimation("fire")

	this.setHitbox(0,-0, this.sprite.w, this.sprite.h);
	this.lifeTime = 2000;
};

Bullet.prototype = Object.create(Entity.prototype);

Bullet.prototype.update = function(dt) {
	Entity.prototype.update.call(this, dt);

	var enemies = this.game.entities["enemies"];
	var e;
	for(var i in enemies) {
		e = enemies[i];
		if(this.game.hasCollision(this, e)) {
			this.kill();
			e.kill();
			this.game.audioManager.play("explosion1");
			for(var i = 0; i < 10 * e.scale; i++) {
				var p = new Entity(this.game, this.x, this.y, 5, 5);
				p.update = function(dt) {
					Entity.prototype.update.call(this, dt);
					this.color = this.game.colors[Math.floor(Math.random() * 6)];
				}
				p.lifeTime = 500;
				p.gravity = 100;
				p.vx = 50 - Math.random() * 100;
				p.vy = 50 - Math.random() * 100;
				this.game.add(p, "particles");
			}
			break;
		}
		
	}
	
	if(this.game.hasCollision(this, this.game.currentState.core)) this.kill();
};
