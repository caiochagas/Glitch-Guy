var Renderer = function() {
	this.canvas = document.getElementById("g");
	this.ctx = this.canvas.getContext("2d");

	this.ctx.mozImageSmoothingEnabled = false;
	this.ctx.webkitImageSmoothingEnabled = false;
	this.ctx.msImageSmoothingEnabled = false;
	this.ctx.imageSmoothingEnabled = false;
};

Renderer.prototype.clear = function() {
	this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
};

Renderer.prototype.drawText = function(text, x, y, attributes) {
	var ctx = this.ctx;
	var attributes = attributes ? attributes : {};

	var fontSize = attributes.fontSize || '12px';
	var fontType = attributes.fontType || 'normal';
	var fontFamily = attributes.fontFamily || 'arial';

	ctx.save();
	ctx.font = fontType + " " + fontSize + " " + fontFamily;
	ctx.textAlign = attributes.textAlign || "left";
	ctx.textBaseline = attributes.textBaseline || "alphabetic";

	if(attributes.stroke) {
		ctx.strokeStyle = attributes.color || 'black';
		ctx.lineWidth = attributes.lineWidth || 1;
		ctx.strokeText(text, x, y);
	}else{
		ctx.fillStyle = attributes.color || 'black';
		ctx.fillText(text, x, y);
	}
	ctx.restore();
};

Renderer.prototype.drawButton = function(text, fs, x, y, w, h) {
	var ctx = this.ctx;
	ctx.save();
	ctx.fillStyle = "white";
	ctx.fillRect(x,y,w,h);
	ctx.strokeStyle = "black";
	ctx.lineWidth = 2;
	ctx.strokeRect(x,y,w,h);

	this.drawText(text, x + w / 2, y + h / 2, {fontSize: fs, textAlign: "center", textBaseline: "middle"})
	ctx.restore();
};
