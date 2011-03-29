var draft76 = require('../../lib/protocols/draft76');
var tests = exports;

tests.parser = {
  'Initial Properties': function(test) {
    var parser = draft76.createIncomingStream();

    test.ok(parser.writable);
    test.equal(parser.busy, false);
    test.equal(parser._parseState, 0);
    test.equal(parser._queue.length, 0);
    test.equal(parser._buffer.length, 0);
    test.done();
  },

  'simple write': function(test) {
    var parser = draft76.createIncomingStream();

    parser.on('message', function(type, message) {
      test.equal(type, 'text');
      test.equal(message, 'hello world');
      test.done();
    });

    parser.write([
      0x00, 0x68, 0x65, 0x6c,
      0x6c, 0x6f, 0x20, 0x77,
      0x6f, 0x72, 0x6c, 0x64,
      0xFF
    ]);
  },

  'chunked writes': function(test) {
    var parser = draft76.createIncomingStream();
    var drains = 0, got_message = false;

    parser.on('message', function(type, message) {
      test.equal(type, 'text');
      test.equal(message, 'hello world');
      got_message = true;
    });

    parser.on('drain', function() {
      ++drains;
      test.equal(parser.drainable, false);
      if (got_message) {
        test.equal(drains, 1);
        test.done();
      }
    });

    test.equal(parser._parseState, 0);
    test.equal(parser.drainable, false);

    parser.write([
      0x00, 0x68, 0x65, 0x6c, 0x6c, 0x6f
    ]);

    test.equal(parser.drainable, true);

    process.nextTick(function() {
      test.equal(parser._parseState, 1);
      parser.write([
        0x20, 0x77, 0x6f, 0x72, 0x6c, 0x64, 0xFF
      ]);
    });
  },

  'close frame': function(test) {
    var parser = draft76.createIncomingStream();

    parser.on('close', function() {
      test.equal(parser.writable, false);
      test.done();
    });

    test.equal(parser.writable, true);

    parser.write([0xFF, 0x00]);
  },

  'chunked close frame': function(test) {
    var parser = draft76.createIncomingStream();
    parser.on('close', function() {
      test.equal(parser.writable, false);
      test.done();
    });

    test.equal(parser.writable, true);

    parser.write([0xFF]);
    process.nextTick(function() {
      parser.write([0x00]);
    });
  }
};
