var AssetManager = function() {
	this.assets= {};
    this.assetsFail = {};
    this.totalAssets = 0;
    this.assetsFailed = 0;
    this.assetsLoaded = 0;
    this.finishedLoad = false;
    this.callbackOnLoad = null;
};

AssetManager.prototype.load = function(assets) {
	var self = this;

	for(var key in assets) {
		this.totalAssets += 1;
		(function(k) {
			var asset = assets[k];

			var image = new Image();

			image.addEventListener("load", function(){
				console.log(k, image)
				self.assets[k] = image;
				self.assetsLoaded++;
				self.finishLoad();
			});

			image.addEventListener("error", function(){
				self.assetsFail[k] = image;
				self.assetsFailed++;
				self.finishLoad();
			});
			console.log(asset)
			image.src = asset;
		}(key));
	}
};

AssetManager.prototype.finishLoad = function() {
	if(this.totalAssets == this.assetsLoaded + this.assetsFailed) {
		this.finishedLoad = true;
		this.callbackOnLoad();
	}
};

AssetManager.prototype.onFinishLoad = function(callback) {
	this.callbackOnLoad = callback;
};
