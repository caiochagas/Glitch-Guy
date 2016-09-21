var Enemy = function(game, x, y, w, h) {
	Entity.call(this, game, x, y, w, h);

	this.sprite = new Sprite(game, game.assetManager.assets.robot, 16, 16);
	this.sprite.addAnimation(new Animation(game, 'walking', [[0, 0], [0, 1]], 100));
	this.sprite.setAnimation("walking");

	if(this.x >= this.game.screen.w / 2) this.mirror = true;

	this.setHitbox(0,0,this.sprite.w, this.sprite.h);
	this.scale = 3;
	this.visionHitbox = {
		offsetX: 0,
		offsetY: 0,
		w: 100,
		h: 30
	}
	this.timeToOver = 1000;
};

Enemy.prototype = Object.create(Entity.prototype);

Enemy.prototype.update = function(dt) {
	Entity.prototype.update.call(this, dt);

	this.setHitbox(-60 / this.scale,-60 / this.scale, (120 + this.sprite.w * this.scale) / this.scale, (120 + this.sprite.h * this.scale) / this.scale);
	var hero = this.game.currentState.hero;

	if(this.game.hasCollision(this, hero)) {
		this.destiny(hero.x, hero.y);
	}else {
		this.destiny(this.game.screen.hw, this.game.screen.hh);
	}

	this.setHitbox(0,0,this.sprite.w, this.sprite.h);

	var core = this.game.currentState.core;
	if(core.isAlive && hero.isAlive) {
		if(this.game.hasCollision(this, core)) {
			this.game.audioManager.play("explosion2");
			core.kill();
			var s = core.w / 10;
			for(var i = 0; i < 30; i++) {

				var p = new Entity(this.game, core.x, core.y, s, s);
				p.update = function(dt) {
					Entity.prototype.update.call(this, dt);
					this.color = this.game.colors[Math.floor(Math.random() * 6)];;
				}
				p.lifeTime = 1000;
				p.gravity = 50;
				p.vx = 200 - Math.random() * 400;
				p.vy = 200 - Math.random() * 400;
				this.game.add(p, "particles");
			}	
		}

		if(this.game.hasCollision(this, hero)) {
			this.game.audioManager.play("hit");
			hero.kill();
			hero.gun .kill();
			for(var i = 0; i < 30; i++) {
				var p = new Entity(this.game, hero.x, hero.y, 5, 5);
				p.update = function(dt) {
					Entity.prototype.update.call(this, dt);
					this.color = "red";
				}
				p.lifeTime = 1000;
				p.gravity = 100;
				p.vx = 50 - Math.random() * 100;
				p.vy = 50 - Math.random() * 100;
				this.game.add(p, "particles");
			}
		};
	}else {
		this.timeToOver -= dt * 1000;
		if(this.timeToOver <= 0) this.game.startState("gameover", Math.floor(this.game.currentState.score));
	}
};
