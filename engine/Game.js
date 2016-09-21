var Game = function() {
	this.entities = [];
	this.currentState = null;
	this.renderer = new Renderer();
	this.time = new Time(this);
	this.screen = new Screen(this, 800, 480);
	this.mouse = new Mouse(this.renderer, this.screen);
	this.assetManager = new AssetManager();
	this.audioManager = new AudioManager();
	this.keyboard = new Keyboard(this);
	this.pause = false;

	var self = this;
	this.assetManager.onFinishLoad(function() {
		self.start();
		self.loop();
	});
};

Game.prototype.update = function() {
	this.time.update();
	this.currentState.update(this.time.deltaTime);
};

Game.prototype.draw = function() {
	this.renderer.clear();
	this.currentState.draw(this.renderer.ctx);
};

Game.prototype.loop = function() {
	requestAnimFrame(this.loop.bind(this));
	if(this.pause) return;
	if(this.assetManager.finishedLoad) {
		this.update();
		this.draw();
		var entity, e;
		if(this.currentState) {
			for(var i in this.entities) {
				if(!this.entities[i]) break;
				if(this.entities[i] instanceof Array) {
					for(var j in this.entities[i]) {
						if(!this.entities[i]) break;
						entity = this.entities[i][j];
						entity.update(this.time.deltaTime);
						entity.draw(this.renderer.ctx);
					}
				} else {
					entity = this.entities[i];
					entity.update(this.time.deltaTime);
					entity.draw(this.renderer.ctx);
					
				}
				
			}
		}
	}
};

Game.prototype.startState = function(state, data) {
	this.mouse.clickCallbacks = [];
	this.entities = [];
	this.currentState = new this.states[state](this, data);
};

Game.prototype.hasCollision = function(a, b) {
	if(!a.hitbox && b.hitbox) return;
	ax =  a.rx + a.hitbox.offsetX * a.scale;
	ay =  a.ry + a.hitbox.offsetY * a.scale; 
	bx =  b.rx + b.hitbox.offsetX * b.scale;
	by =  b.ry + b.hitbox.offsetY * b.scale;

	return (ax < bx + b.hitbox.w * b.scale && ax + a.hitbox.w  * a.scale > bx && ay < by + b.hitbox.h  * b.scale && a.hitbox.h * a.scale + ay > by);
};

Game.prototype.add = function(entity, groupName) {
	if(groupName == null) {
		this.entities.push(entity);
	} else {
		this.entities[groupName].push(entity);
		entity.group = groupName;
	}
};

Game.prototype.createGroup = function(name) {
	return this.entities[name] = [];
};
