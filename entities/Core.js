var Core = function(game) {
	Entity.call(this, game);

	this.x = game.screen.hw;
	this.y = game.screen.hh;
	this.w = 20;
	this.h = 20;

	this.setHitbox(0,0, this.w, this.h);
};

Core.prototype = Object.create(Entity.prototype);

Core.prototype.update = function(dt) {
	Entity.prototype.update.call(this, dt);
	this.w += dt;
	this.h += dt;
	this.setHitbox(0,0, this.w, this.h)
};

Core.prototype.draw = function(ctx) {
	for(var  i = 0; i < this.w; i += 5) {
		for(var  j = 0; j < this.w; j += 5) {
			ctx.fillStyle = this.game.colors[Math.floor(Math.random() * 6)];
			ctx.fillRect(this.rx + i , this.ry + j, 5, 5);
		}
	}
};
