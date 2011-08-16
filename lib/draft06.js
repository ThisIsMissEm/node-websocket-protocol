var ctio = require('../../vendor/node-ctype/ctio');

var OPCODES_BY_STR = {
  continuation: 0x00,
  close: 0x01,
  ping: 0x02,
  pong: 0x03,
  text: 0x04,
  binary: 0x05
};

var OPCODES_BY_CODE = {
  0x00: "continuation",
  0x01: "close",
  0x02: "ping",
  0x03: "pong",
  0x04: "text",
  0x05: "binary"
};

function is_final(opcode) {
  return (opcode !== 0x00);
}

function is_fragmentable(opcode) {
  return (opcode === 0x04 || opcode === 0x05)
}

exports.Formatter = Formatter;
exports.formatter = new Formatter();

function Formatter(useMask) {
  this._writeQueue = [];
  this._mask = arguments.length > 0 ? useMask : false;
  stream.Stream.call(this);
}





Formatter.prototype.frame = function(
    fin_, rsv1, rsv2, rsv3, rsv4,
    opcode, data) {

  // data = {binary: null, utf8: null, code: null}
  data = data || {};

  if (data['binary'] && !Buffer.isBuffer(data['binary'])) {
    throw new Error('Frame data of binary must be a Buffer');
  }

  if (data['utf8'] && typeof data['utf8'] !== 'string') {
    throw new Error('Frame data of utf8 must be a String');
  }

  if (data['code'] && opcode !== 0x01) {
    throw new Error('Frame data[\'code\'] is only allowed on Close Frames');
  }


  var headerLength = 2;
  var payloadLength = 0;
  var payload; // type:Buffer
  var frame; // type:Buffer

  // masking is used for the client -> server.
  var maskBytes = [0x00, 0x00, 0x00, 0x00];

// <<<< MASKING
  if (this._mask) {
    var maskKey = Math.ceil(Math.random() * 0xFFFFFFFF);

    maskBytes[0] = (maskKey >> 24) & 0xFF;
    maskBytes[1] = (maskKey >> 16) & 0xFF;
    maskBytes[2] = (maskKey >> 8) & 0xFF;
    maskBytes[3] = (maskKey) & 0xFF;
  }
// MASKING >>>>

  // convert string opcodes to hex:
  if (typeof opcode === 'String') {
    opcode = OPCODES_BY_STR[opcode];
  }

// <<<< PAYLOAD LENGTH CALCULATION
  if (opcode === 0x01) {
    payloadLength = 2;
    // optional utf8 message:
    if (data['utf8']) {
      payloadLength += Buffer.byteLength(data.utf8, 'utf8');
    }
  } else if (data['utf8']) {
    payloadLength = Buffer.byteLength(data.utf8, 'utf8');
  } else if (data['binary']) {
    payloadLength = data.binary.length;
  } else {
    payloadLength = 0;
  }
// PAYLOAD CALCULATION >>>>

  // first to bytes of ANY frame:
  var firstByte = 0x00;
  var secondByte = 0x00;

  // fin is only set if frame is a continuation frame.
  if (fin_) { firstByte |= 0x80; }
  // rsv1-4 aren't in use, hence reserved.
  if (rsv1) { firstByte |= 0x40; }
  if (rsv2) { firstByte |= 0x20; }
  if (rsv3) { firstByte |= 0x10; }
  if (rsv4) { secondByte |= 0x80;}

// add on the opcode to first frame.
  firstByte |= (opcode & 0x0F);

// header length calculations:
  if (payloadLength <= 125) {
    secondByte |= (payloadLength & 0x7F);
  } else if (payloadLength > 125 && payloadLength <= 0xFFFF) {
    secondByte |= 126;
    headerLength += 2;
  } else if (payloadLength > 0xFFFF) {
    secondByte |= 127;
    headerLength += 8;
  }

  frame = new Buffer(headerLength + payloadLength);

// fin + rsv1 + rsv2 + rsv3 + opcode:
  frame[0] = firstByte;

// length:
  frame[1] = secondByte;

// extended length:
  if (payloadLength > 125 && payloadLength <= 0xFFFF) {
    ctio.wuint16(payloadLength, 'big', frame, 2);
  } else if (payloadLength > 0xFFFF) {
    ctio.wuint64([0x00000000, payloadLength], 'big', frame, 2);
  }

// payload:
  if (opcode === 0x01) {
    ctio.wuint16(data.code || 1000, 'big', frame, headerLength);
    if (data.utf8) {
      frame.write(data.utf8, headerLength+2, 'utf8');
    }
  } else if (data.utf8) {
    frame.write(data.utf8, headerLength, 'utf8');
  } else if (data.binary) {
    // this is an O(N) operation, but seriously, who cares?
    data.binary.copy(frame, headerLength);
  }

// frame:Buffer
  return frame;
};





var ctypes = require('../vendor/node-ctype/ctypes');
var stream = require('stream');

var END_OF_FILE = 42;

function is_standard_opcode(opcode) {
  return (
    opcode === 0x00 ||
    opcode === 0x01 ||
    opcode === 0x02 ||
    opcode === 0x03 ||
    opcode === 0x04 ||
    opcode === 0x05)
}

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
};

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
};

// continuation 0x00
// close        0x01
// ping         0x02
// pong         0x03
// text         0x04
// binary       0x05

// frame = {opcode: int, continuation: bool, utf8: string, binary: buffer, code: int}

Encoder.prototype.close = function(code, message) {
  this._queue.push({opcode: 0x01, continuation: true, utf8: message, code: code});
};

Encoder.prototype.ping = function(value) {
  if (Buffer.isBuffer(payload)) {
    this._queue.push({opcode: 0x02, continuation: true, binary: payload});
  } else {
    this._queue.push({opcode: 0x02, continuation: true, utf8: payload});
  }
};

Encoder.prototype.pong = function(value) {
  if (Buffer.isBuffer(payload)) {
    this._queue.push({opcode: 0x03, continuation: true, binary: payload});
  } else {
    this._queue.push({opcode: 0x03, continuation: true, utf8: payload});
  }
};

Encoder.prototype.text = function(payload, continuation) {
  this._queue.push({opcode: 0x04, continuation: continuation, utf8: payload});
};

Encoder.prototype.binary = function(payload, continuation) {
  this._queue.push({opcode: 0x05, continuation: continuation, binary: payload});
};

Encoder.prototype.custom = function(opcode, payload, continuation) {
  if (Buffer.isBuffer(payload)) {
    this._queue.push({opcode: opcode, continuation: continuation, binary: payload});
  } else {
    this._queue.push({opcode: opcode, continuation: continuation, utf8: payload});
  }
};

Encoder.prototype.end = function() {
  this._queue.push(END_OF_FILE);
  this._open = false;
};

Encoder.prototype._encode = function() {
	if (!this._queue.length) return;
	
	var frame = this._queue.shift();
	
};


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
