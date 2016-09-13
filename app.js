/**
 * SfxrParams
 *
 * Copyright 2010 Thomas Vian
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @author Thomas Vian
 */
/** @constructor */
function SfxrParams() {
  //--------------------------------------------------------------------------
  //
  //  Settings String Methods
  //
  //--------------------------------------------------------------------------

  /**
   * Parses a settings array into the parameters
   * @param array Array of the settings values, where elements 0 - 23 are
   *                a: waveType
   *                b: attackTime
   *                c: sustainTime
   *                d: sustainPunch
   *                e: decayTime
   *                f: startFrequency
   *                g: minFrequency
   *                h: slide
   *                i: deltaSlide
   *                j: vibratoDepth
   *                k: vibratoSpeed
   *                l: changeAmount
   *                m: changeSpeed
   *                n: squareDuty
   *                o: dutySweep
   *                p: repeatSpeed
   *                q: phaserOffset
   *                r: phaserSweep
   *                s: lpFilterCutoff
   *                t: lpFilterCutoffSweep
   *                u: lpFilterResonance
   *                v: hpFilterCutoff
   *                w: hpFilterCutoffSweep
   *                x: masterVolume
   * @return If the string successfully parsed
   */
  this.setSettings = function(values)
  {
    for ( var i = 0; i < 24; i++ )
    {
      this[String.fromCharCode( 97 + i )] = values[i] || 0;
    }

    // I moved this here from the reset(true) function
    if (this['c'] < .01) {
      this['c'] = .01;
    }

    var totalTime = this['b'] + this['c'] + this['e'];
    if (totalTime < .18) {
      var multiplier = .18 / totalTime;
      this['b']  *= multiplier;
      this['c'] *= multiplier;
      this['e']   *= multiplier;
    }
  }
}

/**
 * SfxrSynth
 *
 * Copyright 2010 Thomas Vian
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @author Thomas Vian
 */
/** @constructor */
function SfxrSynth() {
  // All variables are kept alive through function closures

  //--------------------------------------------------------------------------
  //
  //  Sound Parameters
  //
  //--------------------------------------------------------------------------

  this._params = new SfxrParams();  // Params instance

  //--------------------------------------------------------------------------
  //
  //  Synth Variables
  //
  //--------------------------------------------------------------------------

  var _envelopeLength0, // Length of the attack stage
      _envelopeLength1, // Length of the sustain stage
      _envelopeLength2, // Length of the decay stage

      _period,          // Period of the wave
      _maxPeriod,       // Maximum period before sound stops (from minFrequency)

      _slide,           // Note slide
      _deltaSlide,      // Change in slide

      _changeAmount,    // Amount to change the note by
      _changeTime,      // Counter for the note change
      _changeLimit,     // Once the time reaches this limit, the note changes

      _squareDuty,      // Offset of center switching point in the square wave
      _dutySweep;       // Amount to change the duty by

  //--------------------------------------------------------------------------
  //
  //  Synth Methods
  //
  //--------------------------------------------------------------------------

  /**
   * Resets the runing variables from the params
   * Used once at the start (total reset) and for the repeat effect (partial reset)
   */
  this.reset = function() {
    // Shorter reference
    var p = this._params;

    _period       = 100 / (p['f'] * p['f'] + .001);
    _maxPeriod    = 100 / (p['g']   * p['g']   + .001);

    _slide        = 1 - p['h'] * p['h'] * p['h'] * .01;
    _deltaSlide   = -p['i'] * p['i'] * p['i'] * .000001;

    if (!p['a']) {
      _squareDuty = .5 - p['n'] / 2;
      _dutySweep  = -p['o'] * .00005;
    }

    _changeAmount =  1 + p['l'] * p['l'] * (p['l'] > 0 ? -.9 : 10);
    _changeTime   = 0;
    _changeLimit  = p['m'] == 1 ? 0 : (1 - p['m']) * (1 - p['m']) * 20000 + 32;
  }

  // I split the reset() function into two functions for better readability
  this.totalReset = function() {
    this.reset();

    // Shorter reference
    var p = this._params;

    // Calculating the length is all that remained here, everything else moved somewhere
    _envelopeLength0 = p['b']  * p['b']  * 100000;
    _envelopeLength1 = p['c'] * p['c'] * 100000;
    _envelopeLength2 = p['e']   * p['e']   * 100000 + 12;
    // Full length of the volume envelop (and therefore sound)
    // Make sure the length can be divided by 3 so we will not need the padding "==" after base64 encode
    return ((_envelopeLength0 + _envelopeLength1 + _envelopeLength2) / 3 | 0) * 3;
  }

  /**
   * Writes the wave to the supplied buffer ByteArray
   * @param buffer A ByteArray to write the wave to
   * @return If the wave is finished
   */
  this.synthWave = function(buffer, length) {
    // Shorter reference
    var p = this._params;

    // If the filters are active
    var _filters = p['s'] != 1 || p['v'],
        // Cutoff multiplier which adjusts the amount the wave position can move
        _hpFilterCutoff = p['v'] * p['v'] * .1,
        // Speed of the high-pass cutoff multiplier
        _hpFilterDeltaCutoff = 1 + p['w'] * .0003,
        // Cutoff multiplier which adjusts the amount the wave position can move
        _lpFilterCutoff = p['s'] * p['s'] * p['s'] * .1,
        // Speed of the low-pass cutoff multiplier
        _lpFilterDeltaCutoff = 1 + p['t'] * .0001,
        // If the low pass filter is active
        _lpFilterOn = p['s'] != 1,
        // masterVolume * masterVolume (for quick calculations)
        _masterVolume = p['x'] * p['x'],
        // Minimum frequency before stopping
        _minFreqency = p['g'],
        // If the phaser is active
        _phaser = p['q'] || p['r'],
        // Change in phase offset
        _phaserDeltaOffset = p['r'] * p['r'] * p['r'] * .2,
        // Phase offset for phaser effect
        _phaserOffset = p['q'] * p['q'] * (p['q'] < 0 ? -1020 : 1020),
        // Once the time reaches this limit, some of the    iables are reset
        _repeatLimit = p['p'] ? ((1 - p['p']) * (1 - p['p']) * 20000 | 0) + 32 : 0,
        // The punch factor (louder at begining of sustain)
        _sustainPunch = p['d'],
        // Amount to change the period of the wave by at the peak of the vibrato wave
        _vibratoAmplitude = p['j'] / 2,
        // Speed at which the vibrato phase moves
        _vibratoSpeed = p['k'] * p['k'] * .01,
        // The type of wave to generate
        _waveType = p['a'];

    var _envelopeLength      = _envelopeLength0,     // Length of the current envelope stage
        _envelopeOverLength0 = 1 / _envelopeLength0, // (for quick calculations)
        _envelopeOverLength1 = 1 / _envelopeLength1, // (for quick calculations)
        _envelopeOverLength2 = 1 / _envelopeLength2; // (for quick calculations)

    // Damping muliplier which restricts how fast the wave position can move
    var _lpFilterDamping = 5 / (1 + p['u'] * p['u'] * 20) * (.01 + _lpFilterCutoff);
    if (_lpFilterDamping > .8) {
      _lpFilterDamping = .8;
    }
    _lpFilterDamping = 1 - _lpFilterDamping;

    var _finished = false,     // If the sound has finished
        _envelopeStage    = 0, // Current stage of the envelope (attack, sustain, decay, end)
        _envelopeTime     = 0, // Current time through current enelope stage
        _envelopeVolume   = 0, // Current volume of the envelope
        _hpFilterPos      = 0, // Adjusted wave position after high-pass filter
        _lpFilterDeltaPos = 0, // Change in low-pass wave position, as allowed by the cutoff and damping
        _lpFilterOldPos,       // Previous low-pass wave position
        _lpFilterPos      = 0, // Adjusted wave position after low-pass filter
        _periodTemp,           // Period modified by vibrato
        _phase            = 0, // Phase through the wave
        _phaserInt,            // Integer phaser offset, for bit maths
        _phaserPos        = 0, // Position through the phaser buffer
        _pos,                  // Phase expresed as a Number from 0-1, used for fast sin approx
        _repeatTime       = 0, // Counter for the repeats
        _sample,               // Sub-sample calculated 8 times per actual sample, averaged out to get the super sample
        _superSample,          // Actual sample writen to the wave
        _vibratoPhase     = 0; // Phase through the vibrato sine wave

    // Buffer of wave values used to create the out of phase second wave
    var _phaserBuffer = new Array(1024),
        // Buffer of random values used to generate noise
        _noiseBuffer  = new Array(32);
    for (var i = _phaserBuffer.length; i--; ) {
      _phaserBuffer[i] = 0;
    }
    for (var i = _noiseBuffer.length; i--; ) {
      _noiseBuffer[i] = Math.random() * 2 - 1;
    }

    for (var i = 0; i < length; i++) {
      if (_finished) {
        return i;
      }

      // Repeats every _repeatLimit times, partially resetting the sound parameters
      if (_repeatLimit) {
        if (++_repeatTime >= _repeatLimit) {
          _repeatTime = 0;
          this.reset();
        }
      }

      // If _changeLimit is reached, shifts the pitch
      if (_changeLimit) {
        if (++_changeTime >= _changeLimit) {
          _changeLimit = 0;
          _period *= _changeAmount;
        }
      }

      // Acccelerate and apply slide
      _slide += _deltaSlide;
      _period *= _slide;

      // Checks for frequency getting too low, and stops the sound if a minFrequency was set
      if (_period > _maxPeriod) {
        _period = _maxPeriod;
        if (_minFreqency > 0) {
          _finished = true;
        }
      }

      _periodTemp = _period;

      // Applies the vibrato effect
      if (_vibratoAmplitude > 0) {
        _vibratoPhase += _vibratoSpeed;
        _periodTemp *= 1 + Math.sin(_vibratoPhase) * _vibratoAmplitude;
      }

      _periodTemp |= 0;
      if (_periodTemp < 8) {
        _periodTemp = 8;
      }

      // Sweeps the square duty
      if (!_waveType) {
        _squareDuty += _dutySweep;
        if (_squareDuty < 0) {
          _squareDuty = 0;
        } else if (_squareDuty > .5) {
          _squareDuty = .5;
        }
      }

      // Moves through the different stages of the volume envelope
      if (++_envelopeTime > _envelopeLength) {
        _envelopeTime = 0;

        switch (++_envelopeStage)  {
          case 1:
            _envelopeLength = _envelopeLength1;
            break;
          case 2:
            _envelopeLength = _envelopeLength2;
        }
      }

      // Sets the volume based on the position in the envelope
      switch (_envelopeStage) {
        case 0:
          _envelopeVolume = _envelopeTime * _envelopeOverLength0;
          break;
        case 1:
          _envelopeVolume = 1 + (1 - _envelopeTime * _envelopeOverLength1) * 2 * _sustainPunch;
          break;
        case 2:
          _envelopeVolume = 1 - _envelopeTime * _envelopeOverLength2;
          break;
        case 3:
          _envelopeVolume = 0;
          _finished = true;
      }

      // Moves the phaser offset
      if (_phaser) {
        _phaserOffset += _phaserDeltaOffset;
        _phaserInt = _phaserOffset | 0;
        if (_phaserInt < 0) {
          _phaserInt = -_phaserInt;
        } else if (_phaserInt > 1023) {
          _phaserInt = 1023;
        }
      }

      // Moves the high-pass filter cutoff
      if (_filters && _hpFilterDeltaCutoff) {
        _hpFilterCutoff *= _hpFilterDeltaCutoff;
        if (_hpFilterCutoff < .00001) {
          _hpFilterCutoff = .00001;
        } else if (_hpFilterCutoff > .1) {
          _hpFilterCutoff = .1;
        }
      }

      _superSample = 0;
      for (var j = 8; j--; ) {
        // Cycles through the period
        _phase++;
        if (_phase >= _periodTemp) {
          _phase %= _periodTemp;

          // Generates new random noise for this period
          if (_waveType == 3) {
            for (var n = _noiseBuffer.length; n--; ) {
              _noiseBuffer[n] = Math.random() * 2 - 1;
            }
          }
        }

        // Gets the sample from the oscillator
        switch (_waveType) {
          case 0: // Square wave
            _sample = ((_phase / _periodTemp) < _squareDuty) ? .5 : -.5;
            break;
          case 1: // Saw wave
            _sample = 1 - _phase / _periodTemp * 2;
            break;
          case 2: // Sine wave (fast and accurate approx)
            _pos = _phase / _periodTemp;
            _pos = (_pos > .5 ? _pos - 1 : _pos) * 6.28318531;
            _sample = 1.27323954 * _pos + .405284735 * _pos * _pos * (_pos < 0 ? 1 : -1);
            _sample = .225 * ((_sample < 0 ? -1 : 1) * _sample * _sample  - _sample) + _sample;
            break;
          case 3: // Noise
            _sample = _noiseBuffer[Math.abs(_phase * 32 / _periodTemp | 0)];
        }

        // Applies the low and high pass filters
        if (_filters) {
          _lpFilterOldPos = _lpFilterPos;
          _lpFilterCutoff *= _lpFilterDeltaCutoff;
          if (_lpFilterCutoff < 0) {
            _lpFilterCutoff = 0;
          } else if (_lpFilterCutoff > .1) {
            _lpFilterCutoff = .1;
          }

          if (_lpFilterOn) {
            _lpFilterDeltaPos += (_sample - _lpFilterPos) * _lpFilterCutoff;
            _lpFilterDeltaPos *= _lpFilterDamping;
          } else {
            _lpFilterPos = _sample;
            _lpFilterDeltaPos = 0;
          }

          _lpFilterPos += _lpFilterDeltaPos;

          _hpFilterPos += _lpFilterPos - _lpFilterOldPos;
          _hpFilterPos *= 1 - _hpFilterCutoff;
          _sample = _hpFilterPos;
        }

        // Applies the phaser effect
        if (_phaser) {
          _phaserBuffer[_phaserPos % 1024] = _sample;
          _sample += _phaserBuffer[(_phaserPos - _phaserInt + 1024) % 1024];
          _phaserPos++;
        }

        _superSample += _sample;
      }

      // Averages out the super samples and applies volumes
      _superSample *= .125 * _envelopeVolume * _masterVolume;

      // Clipping if too loud
      buffer[i] = _superSample >= 1 ? 32767 : _superSample <= -1 ? -32768 : _superSample * 32767 | 0;
    }

    return length;
  }
}

// Adapted from http://codebase.es/riffwave/
var synth = new SfxrSynth();
// Export for the Closure Compiler
window['jsfxr'] = function(settings) {
  // Initialize SfxrParams
  synth._params.setSettings(settings);
  // Synthesize Wave
  var envelopeFullLength = synth.totalReset();
  var data = new Uint8Array(((envelopeFullLength + 1) / 2 | 0) * 4 + 44);
  var used = synth.synthWave(new Uint16Array(data.buffer, 44), envelopeFullLength) * 2;
  var dv = new Uint32Array(data.buffer, 0, 44);
  // Initialize header
  dv[0] = 0x46464952; // "RIFF"
  dv[1] = used + 36;  // put total size here
  dv[2] = 0x45564157; // "WAVE"
  dv[3] = 0x20746D66; // "fmt "
  dv[4] = 0x00000010; // size of the following
  dv[5] = 0x00010001; // Mono: 1 channel, PCM format
  dv[6] = 0x0000AC44; // 44,100 samples per second
  dv[7] = 0x00015888; // byte rate: two bytes per sample
  dv[8] = 0x00100002; // 16 bits per sample, aligned on every two bytes
  dv[9] = 0x61746164; // "data"
  dv[10] = used;      // put number of samples here

  // Base64 encoding written by me, @maettig
  used += 44;
  var i = 0,
      base64Characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
      output = 'data:audio/wav;base64,';
  for (; i < used; i += 3)
  {
    var a = data[i] << 16 | data[i + 1] << 8 | data[i + 2];
    output += base64Characters[a >> 18] + base64Characters[a >> 12 & 63] + base64Characters[a >> 6 & 63] + base64Characters[a & 63];
  }
  return output;
}

window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       || 
          window.webkitRequestAnimationFrame || 
          window.mozRequestAnimationFrame    || 
          window.oRequestAnimationFrame      || 
          window.msRequestAnimationFrame     || 
          function(/* function */ callback, /* DOMElement */ element){
            window.setTimeout(callback, 1000 / 60);
          };
})();
var Renderer = function(game) {
	this.game = game;
	this.canvas = document.getElementById("g");
	this.ctx = this.canvas.getContext("2d",{alpha: true});

	this.ctx.mozImageSmoothingEnabled = false;
	this.ctx.webkitImageSmoothingEnabled = false;
	this.ctx.msImageSmoothingEnabled = false;
	this.ctx.imageSmoothingEnabled = false;
}

Renderer.prototype.draw = function(ctx) {
	
}

Renderer.prototype.clear = function() {
	this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
}
Renderer.prototype.drawText = function(text, x, y, attributes) {
	var ctx = this.ctx;
	var attributes = attributes ? attributes : {};

	var fontSize = attributes.fontSize ? attributes.fontSize : '12px';
	var fontType = attributes.fontType ? attributes.fontType : 'normal';
	var fontFamily = attributes.fontFamily ? attributes.fontFamily : 'arial';

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
}

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
}
var Mouse = function(game) {
	this.game = game;

	this.x = 0;
	this.y = 0;

	var self = this;

	game.renderer.canvas.addEventListener("mousemove", function(e) {
		var m = self.getCursorPosition(e);
		var s = self.game.screen.scale;
		self.x = m.x / s;
		self.y = m.y / s;
	})

	this.clickCallbacks = [];

	this.game.renderer.canvas.addEventListener("click", function(e) {
		var click = self.getCursorPosition(e);
		var s = self.game.screen.scale;
		for(var i in self.clickCallbacks) {
			self.clickCallbacks[i](click.x / s, click.y / s)
		}
		
	});
}

Mouse.prototype.onClick = function(callback) {
	var self = this;
	self.clickCallbacks.push(callback);
	
}

Mouse.prototype.getCursorPosition = function(e) {
	var r = this.game.renderer.canvas.getBoundingClientRect();

	return {
		x: e.clientX - r.left,
		y: e.clientY - r.top
	}
}
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
}

Entity.prototype.position = function(x, y) {
	this.x = x;
	this.y = y;
}

Entity.prototype.velocity = function(x, y) {
	this.vx = x;
	this.vy = y;
}

Entity.prototype.setHitbox = function(offsetX, offsetY, w, h) {
	this.hitbox = {
		offsetX: offsetX,
		offsetY: offsetY,
		w: w,
		h: h
	}
}
var Enemy = function(game, x, y, w, h) {
		Entity.call(this, game, x, y, w, h);

		this.px = 0.5;
		this.py = 0.5;

		this.sprite = new Sprite(game, game.assetManager.assets.robot, 16, 16);

		this.sprite.addAnimation(new Animation(game, 'walking', [[0, 0], [0, 1]], 100));
		this.sprite.setAnimation("walking");

		console.log(x , this.game.screen.w / 2)
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
	}

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
}
var Hero = function(game, x, y) {
	Entity.call(this, game, x, y);
	this.isSelected = false;
	this.cooldown = 5000;
	this.canShoot = true;
	this.scale = 2.5;
	this.sprite = new Sprite(game, game.assetManager.assets.hero1, 7, 14);
	this.sprite.addAnimation(new Animation(game, 'idle', [[0, 0]]));
	this.sprite.addAnimation(new Animation(game, 'walking', [[0, 0], [0, 1], [0, 2]], 50));
	this.sprite.setAnimation("idle");
	this.setHitbox(0,0, this.sprite.w, this.sprite.h);
}

Hero.prototype = Object.create(Entity.prototype);

Hero.prototype.update = function(dt) {
	Entity.prototype.update.call(this, dt);

	this.speed += 0.5 * dt;

	var kb = this.game.keyboard;
	var sy = Math.abs(this.vy) / 2;
	var sx = Math.abs(this.vx) / 2;
	if(kb.isDown(kb.keys.A) || kb.isDown(kb.keys.LEFT)) {
		this.sprite.setAnimation("walking");
		this.vx = -this.speed + sy;
	} else if(kb.isDown(kb.keys.D) || kb.isDown(kb.keys.RIGHT)) {
		this.sprite.setAnimation("walking");
		this.vx = this.speed - sy;
	}else {
		this.vx = 0;
	}

	if(kb.isDown(kb.keys.W) || kb.isDown(kb.keys.UP)) {
		this.vy = -this.speed + sx;
		this.sprite.setAnimation("walking");
	} else if(kb.isDown(kb.keys.S) || kb.isDown(kb.keys.DOWN)) {
		this.vy = this.speed - sx;
		this.sprite.setAnimation("walking");
	}else {
		this.vy = 0;
	}

	if(this.vx == 0 && this.vy == 0) {
		this.sprite.setAnimation("idle");
	}

	if(this.cooldown <= 0 && !this.canShoot) {
		this.canShoot = true;
	} else {
		this.cooldown -= dt * 1000;
	}

	var core = this.game.currentState.core;

}

Hero.prototype.shoot = function(e) {
	if(!this.canShoot) return;
	this.canShoot = false;
	this.cooldown = 1000; 
	var b = new Bullet(this.game, this, e);
	this.game.add(b, "bullets");

}

Hero.prototype.onCollide = function(e) {
	console.log("colliding on", e)
}
var Gun = function(game, owner) {
	Entity.call(this, game, owner.x, owner.y);
	this.game = game;
	this.owner = owner;
	this.px = 0;
	this.scale = 2.5;

	this.sprite = new Sprite(game, game.assetManager.assets.gun, 9, 3);
	this.sprite.addAnimation(new Animation(game, 'gunr', [[0, 0], [0, 1]], 20));
	this.sprite.addAnimation(new Animation(game, 'gunl', [[1, 0], [1, 1]], 20));
	this.sprite.setAnimation("gunr")
	
}

Gun.prototype = Object.create(Entity.prototype);

Gun.prototype.update = function(dt) {
	Entity.prototype.update.call(this, dt)
	this.x = this.owner.x;
	this.y = this.owner.y;

	var m = this.game.mouse;

	var dx = m.x - this.x;
	var dy = m.y - this.y;

	this.angle = Math.atan2(dy, dx);

	var a = this.angle * 180 / Math.PI;
	if(a > 90 || a < -90) {
		this.sprite.setAnimation("gunl");
		this.owner.mirror = true;
	} else {
		this.sprite.setAnimation("gunr");
		this.owner.mirror = false;
	}
}

var Core = function(game) {
	Entity.call(this, game);
	
	this.x = game.screen.hw;
	this.y = game.screen.hh;

	this.w = 20;
	this.h = 20;

	this.setHitbox(0,0, this.w, this.h);

}

Core.prototype = Object.create(Entity.prototype);

Core.prototype.update = function(dt) {
	Entity.prototype.update.call(this, dt);
	this.w += dt;
	this.h += dt;
	this.setHitbox(0,0, this.w, this.h)
}

Core.prototype.draw = function(ctx) {

	for(var  i = 0; i < this.w; i += 5) {
		for(var  j = 0; j < this.w; j += 5) {
			ctx.fillStyle = this.game.colors[Math.floor(Math.random() * 6)];
			ctx.fillRect(this.rx + i , this.ry + j, 5, 5);
		}
	}
	//ctx.strokeRect(this.rx + this.hitbox.offsetX , this.ry  + this.hitbox.offsetY ,  this.hitbox.w,  this.hitbox.h);
	//ctx.fillStyle = "black";
}
var Bullet = function(game, owner, angle) {
	Entity.call(this, game, owner.x, owner.y, 10, 5);
	this.owner = owner;
	this.angle = angle;
	this.speed = 500;
	
	this.scale = 4;
	this.sprite = new Sprite(game, game.assetManager.assets.bullet, 3, 2);
	this.sprite.addAnimation(new Animation(game, 'fire', [[0, 0], [0, 1], [0, 2], [0, 0], [0, 2], [0, 1]], 20));
	this.sprite.setAnimation("fire")

	this.setHitbox(0,-0, this.sprite.w, this.sprite.h);
	this.lifeTime = 2000;
}

Bullet.prototype = Object.create(Entity.prototype);

Bullet.prototype.update = function(dt) {
	Entity.prototype.update.call(this, dt);

	var enemies = this.game.entities["enemies"];
	var e;
	for(var i in enemies) {
		e = enemies[i];
		if(this.game.hasCollision(this, e)) {
			this.kill();
			e.kill();
			this.game.audioManager.play("explosion1");
			for(var i = 0; i < 10 * e.scale; i++) {
				var p = new Entity(this.game, this.x, this.y, 5, 5);
				p.update = function(dt) {
					Entity.prototype.update.call(this, dt);
					this.color = this.game.colors[Math.floor(Math.random() * 6)];
				}
				p.lifeTime = 500;
				p.gravity = 100;
				p.vx = 50 - Math.random() * 100;
				p.vy = 50 - Math.random() * 100;
				this.game.add(p, "particles");
			}
			break;
		}
		
	}
	if(this.game.hasCollision(this, this.game.currentState.core)) {
		this.kill();
	}
}
var Time = function(game) {
	this.game = game;
	this.lastDate = null;
	this.deltaTime = 0;
}

Time.prototype.update = function() {
	var now = Date.now();
	this.deltaTime = (now - this.lastDate) / 1000;
	this.lastDate = now;
}
var AssetManager = function(game) {
	this.game = game;
	this.assets= {};
    this.assetsFail = {};
    this.assetsFailed = 0;
    this.assetsLoaded = 0;
    this.finishedLoad = false;
    this.callbackOnLoad = null;
}

AssetManager.prototype.load = function(assets) {
	var self = this;
	this.totalAssets = assets.length;

	for(var i in assets) {
		(function() {
			var asset = assets[i];

			var image = new Image();

			image.addEventListener("load", function(){
				self.assets[asset.name] = image;
				self.assetsLoaded++;
				self.finishLoad();
			});

			image.addEventListener("error", function(){
				self.assetsFail[asset.name] = image;
				self.assetsFailed++;
				self.finishLoad();
			});

			image.src = asset.path;
		}());
	}
}

AssetManager.prototype.finishLoad = function() {
	if(this.totalAssets == this.assetsLoaded + this.assetsFailed) {
		this.finishedLoad = true;
		this.callbackOnLoad();
		console.log("callback")
	}
}

AssetManager.prototype.onFinishLoad = function(callback) {
	this.callbackOnLoad = callback;
}
var AudioManager = function(game) {
	this.game = game;
	this.sounds = {};
}

AudioManager.prototype.load = function(obj) {
	for(var i in obj) {
		this.sounds[i] =  jsfxr(obj[i]);
	}
}

AudioManager.prototype.play = function(name) {
	var player = new Audio();
	player.src = this.sounds[name];
	player.play();
}
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
}

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

}
var Sprite = function(game, image, w, h) {
	this.game = this;
	this.image = image,
	this.w = w;
	this.h = h;
	this.animations = {};
	this.animation = null;
}

Sprite.prototype.addAnimation = function(animation) {
	this.animations[animation.name] = animation;
}

Sprite.prototype.setAnimation = function(name) {

	var animation = this.animations[name];

	for(var i in this.animations) {
		if(this.animations[i] != animation) {
			this.animations[i].isCurrentAnimation = false;
		}
	}

	if(this.animation != animation) {
		this.animation = animation;
		animation.frameCount = 0;
	}
	
}
var Animation = function(game, name, frames, speed) {
	this.game = game;
	this.name = name;
	this.frames = frames;
	this.speed = speed || null;

	this.frameCount = 0;

	var self = this;

	this.time = speed;
}

Animation.prototype.update = function(dt) {
	if (!this.speed) return;
	if(this.time <= 0) {
		this.addFrame();
		this.time = this.speed;
	}else {
		this.time -= dt * 1000;
	}
}


 Animation.prototype.addFrame = function() {

	if(this.frameCount < this.frames.length - 1) {
		this.frameCount++;
	}else{
		this.frameCount = 0;
	}
}

 Animation.prototype.getCurrentFrame = function() {
 	return this.frames[this.frameCount];
}
var Keyboard = function(game) {
	this.game = game;
	this.keys = {
		W: 87,
		A: 65,
		S: 83,
		D: 68,
		P: 80,
		LEFT: 37,
		UP: 38,
		RIGHT: 39,
		DOWN: 40
	};
	this.keysDown = [];

	var self = this;
	window.addEventListener('keydown', function(e) {
		e.preventDefault();
		self.keysDown["k" + e.keyCode] = true;
	});

	window.addEventListener('keyup', function(e) {
		e.preventDefault();
		console.log(e.keyCode == 80)
		if(e.keyCode == 80 &&  self.game.currentState instanceof PlayState) {
			self.game.pause = !self.game.pause;
			self.game.time.lastDate = Date.now();
		}
		delete self.keysDown["k" + e.keyCode];
	})
    
}

Keyboard.prototype.isDown = function(key) {
	return ("k" + key in this.keysDown);
}


var MenuState = function(game) {
	this.game = game;
	//

	console.log("chamando o menu")
	var self = this;
	setInterval(function() {
		//self.game.startState("play");
	}, 10000);
	this.buttons = {
		start: {
			text: "START",
			fontSize: "20px",
			rx: self.game.screen.hw - 75,
			ry: 300,
			w: 150,
			h: 30,
			scale: 1,
			hitbox: {
				offsetX: 0,
				offsetY: 0,
				w: 150,
				h: 30
			}
		}
	}

	game.mouse.onClick(function(x, y) {
		if(self.game.hasCollision({rx: x, ry: y, scale: 1, hitbox: {offsetX: 0, offsetY:0, w: 2, h: 2}}, self.buttons.start)) {
			self.game.startState("play");
		}
	});
}

MenuState.prototype.update = function() {
}	

MenuState.prototype.draw = function(ctx) {
	ctx.fillStyle = "white"
	ctx.fillRect(0,0,1000,1000);

	this.game.renderer.drawText("> protect the core glitch from the evil robots", this.game.screen.hw, 170, {
		fontSize: "18px",
		textAlign: "center"
	});

	this.game.renderer.drawText("> use the glitch gun to kill the evil robots", this.game.screen.hw, 200, {
		fontSize: "18px",
		textAlign: "center"
	});


	this.game.renderer.drawText("> [W, A, S, D] or arrow keys to move", this.game.screen.hw, 230, {
		fontSize: "18px",
		textAlign: "center"
	});

	this.game.renderer.drawText("> mouse to aim and shoot", this.game.screen.hw, 260, {
		fontSize: "18px",
		textAlign: "center"
	});

	this.game.renderer.drawText("Glitch Guy", this.game.screen.hw + 2 - Math.random() * 4, 100 + 2 - Math.random() * 4, {
		fontSize: "60px",
		textAlign: "center"
	});


	//this.game.renderer.drawButton("start", "20px", 100,100,100,30);
	//this.game.renderer.button("START",50,50)
	var b;
	for(var i in this.buttons) {
		b = this.buttons[i];
		this.game.renderer.drawButton(b.text, b.fontSize, b.rx, b.ry, b.w, b.h)
	}
}



var PlayState = function(game) {
	this.game = game;

	var self = this;


	
	this.setupEntities();
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

}

PlayState.prototype.update = function(dt) {
	this.score += dt * 1
	if(this.timeToWave <= 0) {
		this.timeToWave = 1300;
		this.wave();
	}else {
		this.timeToWave -= this.game.time.deltaTime * 1000;
	}

	var self = this;
}

PlayState.prototype.draw = function(ctx) {
	ctx.fillStyle = "#c3bfc5";
	ctx.fillRect(0,0,1000,1000);

	this.game.renderer.drawText("score: " + Math.floor(this.score), 20, 20, {
		fontSize: "18px",
	});
}

PlayState.prototype.wave = function() {
	//return;
	
	
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
}


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
}

var GameOverState = function(game, data) {
	this.game = game;
	this.data = data;

	console.log("chamando o menu")
	var self = this;
	setInterval(function() {
		//self.game.startState("play");
	}, 10000);
	this.buttons = {
		start: {
			text: "PLAY AGAIN",
			fontSize: "20px",
			rx: self.game.screen.hw - 75,
			ry: 300,
			w: 150,
			h: 30,
			scale: 1,
			hitbox: {
				offsetX: 0,
				offsetY: 0,
				w: 150,
				h: 30
			}
		},
		menu: {
			text: "MENU",
			fontSize: "20px",
			rx: self.game.screen.hw - 75,
			ry: 350,
			w: 150,
			h: 30,
			scale: 1,
			hitbox: {
				offsetX: 0,
				offsetY: 0,
				w: 150,
				h: 30
			}
		}
	}

	game.mouse.onClick(function(x, y) {
		if(self.game.hasCollision({rx: x, ry: y, scale: 1, hitbox: {offsetX: 0, offsetY:0, w: 2, h: 2}}, self.buttons.start)) {
			self.game.startState("play");
		} else if(self.game.hasCollision({rx: x, ry: y, scale: 1, hitbox: {offsetX: 0, offsetY:0, w: 2, h: 2}}, self.buttons.menu)) {
			self.game.startState("menu");
		}
	});
}

GameOverState.prototype.update = function() {
}	

GameOverState.prototype.draw = function(ctx) {
	ctx.fillStyle = "white"
	ctx.fillRect(0,0,1000,1000);

	this.game.renderer.drawText("Game Over", this.game.screen.hw + 2 - Math.random() * 4, 100+ 2 - Math.random() * 4, {
		fontSize: "60px",
		textAlign: "center"
	});

	this.game.renderer.drawText("score: " + this.data , this.game.screen.hw, 200, {
		fontSize: "28px",
		textAlign: "center"
	});


	//this.game.renderer.drawButton("start", "20px", 100,100,100,30);
	//this.game.renderer.button("START",50,50)
	var b;
	for(var i in this.buttons) {
		b = this.buttons[i];
		this.game.renderer.drawButton(b.text, b.fontSize, b.rx, b.ry, b.w, b.h)
	}
}



var Game = function() {
	this.entities = [];
	this.collisions = [];
	this.currentState = null;
	this.renderer = new Renderer(this);
	this.audioManager = null;
	this.time = new Time(this);
	this.mouse = new Mouse(this);
	this.screen = new Screen(this, 800, 480);
	this.assetManager = new AssetManager(this);
	this.audioManager = new AudioManager();
	this.keyboard = new Keyboard(this);
	
	this.pause = false;

	this.states = {
		menu: MenuState,
		play: PlayState,
		gameover: GameOverState,
	}
	this.assetManager.load([{
		name: "hero1",
		path: "hero1.png"
	},
	{
		name: "bullet",
		path: "bullet.png"
	},
	{
		name: "gun",
		path: "gun.png"
	},
	{
		name: "robot",
		path: "robot.png"
	}]);

	this.audioManager.load({
		fire:[2,,0.1878,,0.1546,0.5929,0.2,-0.2381,,,,,,0.7067,-0.5589,,,,1,,,,,0.5],
		explosion1: [3,,0.1242,0.3111,0.4624,0.2182,,,,,,0.2681,0.7455,,,0.5677,,,1,,,,,0.5],
		explosion2: [3,,0.3083,0.5953,0.4399,0.1956,,0.0331,,,,-0.1818,0.7617,,,,,,1,,,,,0.5],
		hit: [3,,0.0241,,0.2978,0.3721,,-0.5332,,,,,,,,,,,1,,,0.1179,,0.5]
	});
	var self = this;

	this.assetManager.onFinishLoad(function() {
		self.startState("menu");
		self.loop();	
	});

	this.colors = ["#40FEFD", "#FCFF2C", "#02F401", "#FB27FA", "#2A00E2", "#ff0000"];
};

Game.prototype.update = function() {
	this.time.update();
	this.currentState.update(this.time.deltaTime);
}

Game.prototype.draw = function() {
	this.renderer.clear();
	this.renderer.draw();
	this.currentState.draw(this.renderer.ctx);
}

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
	
}

Game.prototype.startState = function(state, data) {
	this.mouse.clickCallbacks = [];
	this.entities = [];
	this.currentState = new this.states[state](this, data);
	
	
	console.log("starting state " + state, this.currentState);
}

Game.prototype.hasCollision = function(a, b) {
	if(!a.hitbox && b.hitbox) return;
	ax =  a.rx + a.hitbox.offsetX * a.scale;
	ay =  a.ry + a.hitbox.offsetY * a.scale; 
	bx =  b.rx + b.hitbox.offsetX * b.scale;
	by =  b.ry + b.hitbox.offsetY * b.scale;

	return (ax < bx + b.hitbox.w * b.scale && ax + a.hitbox.w  * a.scale > bx && ay < by + b.hitbox.h  * b.scale && a.hitbox.h * a.scale + ay > by);
}

Game.prototype.add = function(entity, groupName) {
	if(groupName == null) {
		this.entities.push(entity);
	} else {
		this.entities[groupName].push(entity);
		entity.group = groupName;
	}
}

Game.prototype.remove = function(entity) {
	var index;
	if(entity.group = null) {
		index = this.entities.indexOf(entity);
		index != -1 && this.entities.splice(index, 1);
	} else {
		index = this.entities[entity.group].indexOf(entity);
		index != -1 && this.entities[entity.group].splice(index, 1);
	}
}

Game.prototype.createGroup = function(name) {
	return this.entities[name] = [];
}

Game.prototype.collide = function(a, group, callback, callbackfail) {
	if(!a.isAlive) return;
	if(group.entities != null) {
		for(var i in group.entities) {
			var collided = false;
			var b = group.entities[i];
			//console.log(i);
			(function(b) {
				
				ax =  a.x - a.w * a.px;
				ay =  a.y - a.h * a.py; 
				bx =  b.x - b.w * b.px;
				by =  b.y - b.h * b.py;
				//console.log(ax < bx + b.w && ax + a.w > bx && ay < by + b.h && a.h + ay > by)
				if(ax < bx + b.w && ax + a.w > bx && ay < by + b.h && a.h + ay > by) {
					
					if(a instanceof Bullet) {
						a.kill();
					} else {
						callback(b);
					}
					console.log("collide", i, b.isAlive, a.isAlive)
					collided = true;
				}
			})(b);
		}
		if(!collided && callbackfail) callbackfail()
	} else {
		if(!group.isAlive) return;
		var b = group;
		ax =  a.x - a.w * a.pivot;
		ay =  a.y - a.h * a.pivot; 
		bx =  b.x - b.w * b.pivot;
		by =  b.y - b.h * b.pivot;
		//console.log(ax < bx + b.w && ax + a.w > bx && ay < by + b.h && a.h + ay > by)
		if(ax < bx + b.w && ax + a.w > bx && ay < by + b.h && a.h + ay > by) {
			callback(b);
		} 
	}

	
}
var g = new Game();


