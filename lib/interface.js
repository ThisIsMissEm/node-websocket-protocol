var stream = require('stream');

var END_OF_FILE = 42;

/*-----------------------------------------------
  Decoder:
-----------------------------------------------*/
// emits:
//  - close(code, message)
//  - ping(value)
//  - pong(value)
//  - text(message, final)
//  - binary(data, final)
//  - custom(opcode, payload, final)
//  - end
function Decoder(use_masking) {
  // Stream state:
  stream.Stream.call(this);
  this.writable = true;

  // Decoder options:
  this.use_masking = use_masking;
  this.max_frame_length = 100 * 1024 * 1024;

  // Private storage:
  this._open = true;
  this._busy = false;
  this._queue = [];
  this._currentFrame = null;
}

util.inherits(Decoder, stream.Stream);

Decoder.prototype.write = function(buffer) {
  this._queue.push(buffer);
};

Decoder.prototype.close = function() {
  this._queue.push(END_OF_FILE);
  this._open = false;
};

Decoder.prototype._decode = function() {};


/*-----------------------------------------------
  Encoder
-----------------------------------------------*/
function Encoder(use_masking) {
  // Stream state:
  stream.Stream.call(this);
  this.readable = true;

  // Options:
  this.use_masking = use_masking;


  // Private variables:
  this._open = true;
  this._busy = false;
  this._queue = [];
}

//protocol.Encoder.prototype.continuation = function() {};
Encoder.prototype.close = function(code, message) {};
Encoder.prototype.ping = function(value) {};
Encoder.prototype.pong = function(value) {};
Encoder.prototype.text = function(message, continuation) {};
Encoder.prototype.binary = function(data, continuation) {};
Encoder.prototype.custom = function(opcode, payload, continuation) {};

Encoder.prototype.end = function() {
  this._queue.push(END_OF_FILE);
  this._open = false;
};

Encoder.prototype._encode = function() {};


/*-----------------------------------------------
  Exports:
-----------------------------------------------*/
exports.Decoder = Decoder;
exports.Encoder = Encoder;
exports.createDecoder = function(use_masking) {
  return new Decoder(use_masking);
};

exports.createEncoder = function(use_masking) {
  return new Encoder(use_masking);
};
