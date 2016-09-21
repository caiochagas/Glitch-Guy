var Mouse = function(renderer, screen) {
	this.renderer = renderer;
	this.screen = screen;

	this.x = 0;
	this.y = 0;

	var self = this;

	renderer.canvas.addEventListener("mousemove", function(e) {
		var m = self.getCursorPosition(e);
		var s = self.screen.scale;
		self.x = m.x / s;
		self.y = m.y / s;
	})

	this.clickCallbacks = [];

	renderer.canvas.addEventListener("click", function(e) {
		var click = self.getCursorPosition(e);
		var s = self.screen.scale;
		for(var i in self.clickCallbacks) {
			self.clickCallbacks[i](click.x / s, click.y / s)
		}
	});
};

Mouse.prototype.onClick = function(callback) {
	var self = this;
	self.clickCallbacks.push(callback);
	
};

Mouse.prototype.getCursorPosition = function(e) {
	var r = this.renderer.canvas.getBoundingClientRect();

	return {
		x: e.clientX - r.left,
		y: e.clientY - r.top
	}
};
