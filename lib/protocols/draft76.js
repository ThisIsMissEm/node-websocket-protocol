var stream = require('stream'),
    util = require('util');


/**
 * Checks if this protocol version can handle this request
 *
 * @return {Boolean}  Whether this protocol version can handle this request.
*/
exports.test = function(req) {
  return true;
};


/**
Events:
  - drain
  - error
  - close
**/
function IncomingStream() {
  if (!(this instanceof IncomingStream)) return new IncomingStream();

  stream.Stream.call(this);

  // general state.
  this.writable = true;
  this.drainable = false;
  // Packet States:
  //    0   Idle
  //    1   Text
  //    2   Binary
  //    3   MaybeClosing
  this._parseState = 0;
  // Are we currently parsing?
  this.busy = false;
  // this is a FiFo queue.
  this._queue = [];
  // Storage buffer for final messages.
  this._buffer = [];
}

util.inherits(IncomingStream, stream.Stream);

IncomingStream.prototype.write = function(data) {
  if (!this.writable) {
    this.emit('error', new Error('stream not writable'));
    return false;
  }

  this.drainable = true;
  this._queue.push(data);

  if (!this.busy) {
    var self = this;
    process.nextTick(function() {
      self.flush();
    });
  }

  return false;
};

IncomingStream.prototype.end = function(cb) {
  this.writable = false;
  this.flush();
  cb();
};

IncomingStream.prototype.destroy = function(cb) {
  this.writable = false;
  this._queue = [];
  cb();
};

IncomingStream.prototype.flush = function() {
  if (this.busy) return;
  var self = this;
  var packet = this._queue.shift();

  if (!packet) {
    if (this.drainable && this._buffer.length == 0) {
      this.drainable = false;
      this.emit('drain');
    }
    return;
  }

  this.busy = true;

  var pkt_l = packet.length;
  var state = this._parseState;
  for (var i = 0; i < pkt_l; ++i) {
    var b = packet[i];
    // Idle:
    if (state === 0) {
      if (b & 0x80 === 0x80) {
        state = (b === 0xFF) ? 3 : 2;
      } else {
        state = 1;
      }
    // Text:
    } else if (state === 1) {
      if (b === 0xFF) {
        var message = new Buffer(this._buffer);
        this._buffer = [];
        state = 0;

        this.emit(
            'message',
            'text',
            message.toString('utf8', 0, message.length)
        );
      } else {
        this._buffer.push(b);
      }

    // Binary
    } else if (state === 2 || state === 3) {
      if (b === 0xFF) {
        state = 3;
      } else if (b === 0x00 && this._buffer.length === 0) {
        this.writable = false;
        this.emit('close');
      } else {
        this.emit('error',
            new Error('Binary data is not supported in this protocol version.')
        );
        state = 0;
      }
    }
  }

  this._parseState = state;
  this.busy = false;
  this.flush();
};



function OutgoingStream() {
  stream.Stream.call(this);
  this.writable = true;
  this.readable = true;
}

util.inherits(OutgoingStream, stream.Stream);

OutgoingStream.prototype.write = function(str, encoding) {
  if (Buffer.isBuffer(str)) {
    if (this.encoding.toLowerCase() === 'utf8') {
      this.emit(
          'data',
          '\u0000' + str.toString('utf8', 0, str.length) + '\uffff'
      );
    } else {
      this.emit('error',
          new Error('Binary data is not supported in this protocol version.')
      );
    }
  } else {
    this.emit('data', '\u0000' + data + '\uffff');
  }
};

OutgoingStream.prototype.end = function() {
  this.emit('data', '\uffff\u0000');
  this.emit('end');
};

exports.IncomingStream = IncomingStream;
exports.createIncomingStream = function() {
  return new IncomingStream();
};

exports.OutgoingStream = OutgoingStream;
exports.createOutgoingStream = function() {
  return new OutgoingStream();
};
