var Stream = require('stream').Stream;
var protocol = exports;

function Encoder(use_masking) {
  // act like an EventEmitter
  Stream.call(this);
  this.readable = true;
  this.use_masking = use_masking || false;
};

util.inherits(Stream, Encoder);
protocol.Encoder = Encoder;

/* payload is optional */
Encoder.ping = function(payload) {
  return this.encode(0xA, 0x0, 0x0, 0x0, payload);
};

Encoder.pong = function(payload) {
  return this.encode(0xB, 0x0, 0x0, 0x0, payload);
};

Encoder.close = function(payload) {
  return this.encode(0x8, 0x0, 0x0, 0x0, payload);
};

Encoder.text = function(payload) {
  return this.encode(0x1, 0x0, 0x0, 0x0, payload);
};

Encoder.binary = function(payload) {
  return this.encode(0x2, 0x0, 0x0, 0x0, payload);
};

/*
  This is the function that actually does the hard work.
*/
Encoder.prototype.encode = function(opcode, rsv1, rsv2, rsv3, payload) {
  
}

function mask(key, buf) {
  var len = buf.length,
      maskedBuffer = new Buffer(len);
      
  for (var i=0, j; i < len; ++i) {
    j = i % 4;
    maskedBuffer[i] = buf[i] ^ key[j];
  }
  
  return maskedBuffer;
}