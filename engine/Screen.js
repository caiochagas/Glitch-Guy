var Screen = function(game, w, h) {
	this.game = game;
	this.w = w;
	this.h = h;
	this.hw = w / 2;
	this.hh = h / 2;
	this.scale = 1;

	this.resize();
	var self = this;
	window.addEventListener('resize', this.resize.bind(this));


	window.addEventListener('focus', function() {
		self.game.pause = false;
		self.game.time.lastDate = Date.now();
	});

	window.addEventListener('blur', function() {
		self.game.pause = true;
	});
};

Screen.prototype.resize = function() {

	var w = window.innerWidth;
	var h = window.innerHeight;

	var nw = w / this.w;
	var nh = h / this.h;
        
	var wth = w/h;
	var s = 0;
	if(wth > this.w / this.h) {
		s = h / this.h;
	}else {
		s = w / this.w;
	}

    this.game.renderer.canvas.style.width = 800  * s + "px";
    //this.game.renderer.canvas.style.width = 480  * s + "px";

	this.scale = s;

};
