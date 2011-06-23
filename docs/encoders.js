var stream = require('stream');
var protocol = exports;

/**

---------------------------------------------------------------------------
  Decoders
---------------------------------------------------------------------------

A decoder has two methods: 'write' and 'close'. The 'write' method takes 
a single argument in the form of a Buffer. When a method is called, the 
method call and data should be queued for decoding. EOF for a stream 
should be 42, taking the lead from node.js's net.js.

As data is decoded, events that describe the data should be emitted.
In the case of a decoding error, an "error" event should be emitted.

Once a decoder has decoded all the data it has available, it should emit 
a "drain" event. When an decoder receives EOF, it should emit the "end" 
event. After emitting the "end" event, the decoder should not emit any 
more events.

Example:
  
  > decoder.write(<Buffer 0x82 0x05 0x48 0x65 0x6c 0x6c 0x6f>);
  //  decoder._queue = [
  //    <Buffer 0x82 0x05 0x48 0x65 0x6c 0x6c 0x6f>
  //  ]
  > decoder.write(new Buffer('bar'));
  //  decoder._queue = [
  //    <Buffer 0x82 0x05 0x48 0x65 0x6c 0x6c 0x6f>,
  //    <Buffer 0x84 0x05 0x48 0x65 0x6c 0x6c 0x6f>
  //  ]
  > decoder.close();
  //  decoder._queue = [
  //    <Buffer 0x82 0x05 0x48 0x65 0x6c 0x6c 0x6f>,
  //    <Buffer 0x84 0x05 0x48 0x65 0x6c 0x6c 0x6f>,
  //    42
  //  ]
  ** assume nextTick **
  // event: "ping" <Buffer 0x48 0x65 0x6c 0x6c 0x6f>
  // event: "text" "Hello"
  // event: "end"

---------------------------------------------------------------------------
  Encoders
---------------------------------------------------------------------------

An encoder takes calls to specific methods describing the data. These 
method calls must be queued internally, and then encoded on nextTick, 
as to avoid blocking the thread on write()

An encoder should avoid using Buffer copying. Instead, it should split 
the buffers across separate "data" events.

As data is encoded, "data" events are emitted with one argument, a Buffer 
of the data.

In the case of an encoding error, an "error" event should be emitted with 
one argument, an Exception (new Error()).

Once a encoder has encoded all the data it has available, it should emit 
a "drain" event. When an encoder receives EOF, it should emit the "end" 
event. After emitting the "end" event, the encoder should not emit any 
more events.

Example: (for websockets)

  > encoder.ping('Hello');
  //  encoder._queue = [
  //    [0x02, 'Hello']
  //  ]
  > encoder.text('Hello');
  //  encoder._queue = [
  //    [0x02, 'Hello'],
  //    [0x04, 'Hello']
  //  ]
  > encoder.binary(<Buffer 66 6f 6f>)
  //  encoder._queue = [
  //    [0x02, 'Hello'],
  //    [0x04, 'Hello'],
  //    [0x05, <Buffer 66 6f 6f>]
  //  ]
  > encoder.end();
  //  encoder._queue = [
  //    [0x02, 'Hello'],
  //    [0x04, 'Hello'],
  //    [0x05, <Buffer 66 6f 6f>],
  //    42
  //  ]
  ** assumes nextTick **
  // event: "data" <Buffer 0x82 0x05 0x48 0x65 0x6c 0x6c 0x6f>
  // event: "data" <Buffer 0x84 0x05 0x48 0x65 0x6c 0x6c 0x6f>
  // event: "data" <Buffer 0x85 0x03>
  // event: "data" <Buffer 0x66 0x6f 0x6f>
  // event: "end"
  
---------------------------------------------------------------------------
  Relation to Streams in Node.js
---------------------------------------------------------------------------

The following could be assumed true about decoders and encoders:

 |--------------------+-------------------|
 |                    |    Stream Type    |
 |--------------------+-------------------|
 |  protocol.decoder  |  writable stream  |
 |  protocol.encoder  |  readable stream  |
 |--------------------+-------------------|

For more information on both writable and readable streams, see:

  https://github.com/joyent/node/wiki/Streams


**/


// for a server, use_masking should be false
// for a client, use_masking should be true
// emits:
//    - connection close  (code, string)
//    - ping              (buffer)
//    - pong              (buffer)
//    - text              (string)
//    - binary            (buffer)
//    - reserved          ([bit, bit, bit, bit], buffer)

protocol.decoder = function(use_masking) {
  this.busy = false;
  this._decodeQueue = [];
  
  stream.Stream.call(this);
}

util.inherits(protocol.encoder, stream.Stream);

protocol.decoder.prototype.write = function(buffer) {}
protocol.decoder.prototype._decode = function() {};


protocol.encoder = function(use_masking) {
  this.busy = false;
  this._encodeQueue = [];
  
  stream.Stream.call(this);
}

util.inherits(protocol.encoder, stream.Stream);

protocol.encoder.prototype._encode = function() {};