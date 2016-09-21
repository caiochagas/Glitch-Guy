var GlitchGuyGame = function() {
	Game.call(this);

	this.states = {
		menu: MenuState,
		play: PlayState,
		gameover: GameOverState
	}

	this.assetManager.load({
		hero1: "assets/images/hero1.png",
		bullet: "assets/images/bullet.png",
		gun: "assets/images/gun.png",
		robot: "assets/images/robot.png",
	});

	this.audioManager.load({
		fire:[2,,0.1878,,0.1546,0.5929,0.2,-0.2381,,,,,,0.7067,-0.5589,,,,1,,,,,0.5],
		explosion1: [3,,0.1242,0.3111,0.4624,0.2182,,,,,,0.2681,0.7455,,,0.5677,,,1,,,,,0.5],
		explosion2: [3,,0.3083,0.5953,0.4399,0.1956,,0.0331,,,,-0.1818,0.7617,,,,,,1,,,,,0.5],
		hit: [3,,0.0241,,0.2978,0.3721,,-0.5332,,,,,,,,,,,1,,,0.1179,,0.5]
	});

	this.colors = ["#40FEFD", "#FCFF2C", "#02F401", "#FB27FA", "#2A00E2", "#ff0000"];
};

GlitchGuyGame.prototype = Object.create(Game.prototype);

GlitchGuyGame.prototype.start = function() {
	this.startState("menu");
}

new GlitchGuyGame();