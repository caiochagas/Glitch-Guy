var Entity = function(game, x, y, w, h, vx, vy) {
	this.game = game;
	this.x = x;
	this.y = y;
	this.w = w;
	this.h = h;
	this.vx = vx || 0;
	this.vy = vy || 0;
	this.dx = -1;
	this.dy = -1;
	this.angle = 0;
	this.speed = 100;

	this.px = 0.5;
	this.py = 0.5;

	this.color = "black";
	this.group = null;
	this.isAlive = true;
	this.sprite = null;
	this.mirror = false
	this.scale = 1;
	this.hitbox = null;
	this.rx = x;
	this.ty = y;

	this.gravity = 0;

	this.lifeTime = null;
}

Entity.prototype.update = function(dt) {
	if(this.lifeTime != null) {
		this.lifeTime -= dt * 1000;
		if(this.lifeTime <= 0) {
			this.kill();
			return;
		}
	}
	this.moveToDestiny(dt);
	if(this.sprite) {
		this.sprite.animation.update(dt);
		this.rx = this.x -this.sprite.w * this.px * this.scale;
		this.ry = this.y -this.sprite.h * this.py * this.scale;
	} else {
		this.rx = this.x - this.w * this.px * this.scale;
		this.ry = this.y - this.h * this.py * this.scale;
	}
}

Entity.prototype.draw = function(ctx) {
	ctx.fillStyle = this.color;

	if(this.sprite) {
		
		var startX = this.sprite.animation.getCurrentFrame()[1] * this.sprite.w;
        var startY = this.sprite.animation.getCurrentFrame()[0] * this.sprite.h;
		ctx.save();
		
		ctx.translate(this.x, this.y);
		ctx.rotate(this.angle);
		if(this.mirror) ctx.scale(-1, 1);
		ctx.drawImage(this.sprite.image, startX, startY, this.sprite.w, this.sprite.h,
		-this.sprite.w * this.px * this.scale, -this.sprite.h * this.py * this.scale, this.sprite.w * this.scale, this.sprite.h * this.scale);
		ctx.restore();

		//if(this.hitbox) {
		//var s = this.hitbox.ignoreScale ? 1 : this.scale;
		//	ctx.strokeRect(this.rx + this.hitbox.offsetX * s, this.ry  + this.hitbox.offsetY * s,  this.hitbox.w * s,  this.hitbox.h * s);
		//}
	} else {

		this.rx = this.x -this.w * this.px * this.scale;
		this.ry = this.y -this.h * this.py * this.scale;
		ctx.fillRect(this.x - this.w * this.px, this.y - this.h * this.py, this.w, this.h);
		//if(this.hitbox)
		//ctx.strokeRect(this.rx - this.hitbox.offsetX, this.ry  - this.hitbox.offsetY,  this.hitbox.w * this.scale,  this.hitbox.h * this.scale);
	}
}

Entity.prototype.moveToDestiny = function(dt) {
	if(this.dx != -1 || this.dy != -1) {
		var dx =  this.dx - this.x;
		var dy =  this.dy - this.y;
		
		var distance = Math.sqrt(dx * dx + dy * dy);
		var angleR = Math.atan2(dy, dx);
		if(distance < 2) {
			this.x = Math.floor(this.dx);
			this.y = Math.floor(this.dy);
			return;
		}
		this.vx = Math.cos(angleR) * this.speed;
		this.vy = Math.sin(angleR) * this.speed;
	}

	this.vy += this.gravity * dt;
	this.x += this.vx * dt;
	this.y += this.vy * dt;
}

Entity.prototype.kill = function() {
	this.isAlive = false;
	if(this.group != null) {
		this.game.entities[this.group].splice(this.game.entities[this.group].indexOf(this), 1);
	} else {
		this.game.entities.splice(this.game.entities.indexOf(this), 1);
	}
}

Entity.prototype.destiny = function(x, y) {
	this.dx = x;
	this.dy = y;
};

Entity.prototype.position = function(x, y) {
	this.x = x;
	this.y = y;
};

Entity.prototype.velocity = function(x, y) {
	this.vx = x;
	this.vy = y;
};

Entity.prototype.setHitbox = function(offsetX, offsetY, w, h) {
	this.hitbox = {
		offsetX: offsetX,
		offsetY: offsetY,
		w: w,
		h: h
	};
};
