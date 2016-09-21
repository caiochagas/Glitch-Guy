var PlayState = function(game) {
	this.game = game;
	var self = this;
	
	this.selectedHero = null;

	game.mouse.onClick(function(x, y) {
		if(game.pause) return;

		var dx = x - self.hero.x;
		var dy = y - self.hero.y;

		var angleR = Math.atan2(dy, dx);

		var vx = Math.cos(angleR);
		var vy = Math.sin(angleR);

		var b = new Bullet(self.game, self.hero, angleR);
		b.velocity(vx * b.speed, vy * b.speed);
		self.game.add(b, "bullets");

		self.game.audioManager.play("fire");

	});

	this.timeToWave = 500;
	this.score = 0;

	this.setupEntities();
};

PlayState.prototype.update = function(dt) {
	this.score += dt * 1;
	if(this.timeToWave <= 0) {
		this.timeToWave = 1300;
		this.wave();
	}else {
		this.timeToWave -= this.game.time.deltaTime * 1000;
	}
};

PlayState.prototype.draw = function(ctx) {
	ctx.save();
	ctx.fillStyle = "#c3bfc5";
	ctx.fillRect(0,0,this.game.screen.w,this.game.screen.h);
	ctx.restore();

	this.game.renderer.drawText("score: " + Math.floor(this.score), 20, 20, {
		fontSize: "18px",
	});
};

PlayState.prototype.wave = function() {
	var side = Math.floor(Math.random() * 4)
	var x = y = speed = s = 0;
	s = Math.ceil(Math.random() * 2);
	if(side == 0) {
		y = Math.floor(Math.random() * this.game.screen.h);
		speed = 100;
	} else if(side == 1) {
		x = Math.floor(Math.random() * this.game.screen.w);
		speed = 50;
		s += 2;
	} else if(side == 2) {
		x = this.game.screen.w;
		y = Math.floor(Math.random() * this.game.screen.h);
		speed = 100;
	} else {
		x = Math.floor(Math.random() * this.game.screen.w);
		y = this.game.screen.h;
		speed = 50;
		s += 2;
	}
	var e = new Enemy(this.game, x, y);
	e.scale = s;
	e.speed = speed;
	e.destiny(this.game.renderer.canvas.width / 2, this.game.renderer.canvas.height / 2)
	this.game.add(e, "enemies");
};


PlayState.prototype.setupEntities = function(ctx) {
	this.enimies = this.game.createGroup("enemies");
	this.bullets = this.game.createGroup("bullets");
	this.particles = this.game.createGroup("particles");

	this.hero = new Hero(this.game, this.game.screen.hw - 30, this.game.screen.hh);
	this.hero.gun = new Gun(this.game, this.hero);

	this.core = new Core(this.game);

	this.game.add(this.hero);
	this.game.add(this.hero.gun);

	this.game.add(this.core);
};

