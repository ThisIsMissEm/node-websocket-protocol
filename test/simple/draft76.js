var draft76 = require('../../lib/protocols/draft76');
var common = require('../common');

var tests = exports;

tests.protocol = {
  'Initial Properties': function(test) {
    var protocol = new draft76.Protocol();

    test.ok(protocol.readable);
    test.done();
  },
  'Outgoing': {
    'write': function(test) {
      var protocol = new draft76.Protocol();
      var expected = new Buffer([0x00, 0x74, 0x65, 0x73, 0x74, 0xFF]);

      protocol.on('data', function(data) {
        test.ok(common.equalBuffers(data, expected));
        test.done();
      });

      protocol.write('test');
    },

    'close': function(test) {
      var protocol = new draft76.Protocol();
      var expected = new Buffer([0xff, 0x00]);

      protocol.on('data', function(data) {
        test.equal(protocol.readable, false);
        test.ok(common.equalBuffers(data, expected));
        test.done();
      });

      protocol.close();
    },
  },

  'Incoming': {
    'Initial Properties': function(test) {
      var protocol = new draft76.Protocol();

      test.ok(protocol.parser.writable);
      test.equal(protocol.parser.busy, false);
      test.equal(protocol.parser._parseState, 'ready');
      test.equal(protocol.parser._queue.length, 0);
      test.equal(protocol.parser._buffer.length, 0);
      test.done();
    },

    'simple write': function(test) {
      var protocol = new draft76.Protocol();

      protocol.parser.on('message', function(type, message) {
        test.equal(type, 'text');
        test.equal(message, 'hello world');
        test.done();
      });

      protocol.parser.write(new Buffer([
        0x00, 0x68, 0x65, 0x6c,
        0x6c, 0x6f, 0x20, 0x77,
        0x6f, 0x72, 0x6c, 0x64,
        0xFF
      ]));
    },

    'chunked write': function(test) {
      var protocol = new draft76.Protocol();
      var drains = 0, got_message = false;

      protocol.parser.on('message', function(type, message) {
        test.equal(type, 'text');
        test.equal(message, 'hello world');
        got_message = true;
      });

      protocol.parser.on('drain', function() {
        ++drains;
        test.equal(protocol.parser.drainable, false);
        if (got_message) {
          test.equal(drains, 1);
          test.done();
        }
      });

      test.equal(protocol.parser.drainable, false);
      protocol.parser.write(new Buffer([
        0x00, 0x68, 0x65, 0x6c, 0x6c, 0x6f
      ]));

      test.equal(protocol.parser.drainable, true);

      process.nextTick(function() {
        protocol.parser.write(new Buffer([
          0x20, 0x77, 0x6f, 0x72, 0x6c, 0x64, 0xFF
        ]));
      });
    },

    'multiple writes': function(test) {
      var protocol = new draft76.Protocol();
      var i = 0;
      protocol.parser.on('message', function(type, message) {
        i++;

        test.equal(type, 'text');
        test.equal(message, 'hello world');

        if (i == 2) test.done();
      });

      protocol.parser.write(new Buffer([
        0x00, 0x68, 0x65, 0x6c,
        0x6c, 0x6f, 0x20, 0x77,
        0x6f, 0x72, 0x6c, 0x64,
        0xFF
      ]));

      protocol.parser.write(new Buffer([
        0x00, 0x68, 0x65, 0x6c,
        0x6c, 0x6f, 0x20, 0x77,
        0x6f, 0x72, 0x6c, 0x64,
        0xFF
      ]));
    },

    'close frame': function(test) {
      var protocol = new draft76.Protocol();

      protocol.parser.on('close', function() {
        test.equal(protocol.parser.writable, false);
        test.done();
      });

      test.equal(protocol.parser.writable, true);

      protocol.parser.write(new Buffer([0xFF, 0x00]));
    },

    'chunked close frame': function(test) {
      var protocol = new draft76.Protocol();
      protocol.parser.on('close', function() {
        test.equal(protocol.parser.writable, false);
        test.done();
      });

      test.equal(protocol.parser.writable, true);

      protocol.parser.write(new Buffer([0xFF]));
      process.nextTick(function() {
        protocol.parser.write(new Buffer([0x00]));
      });
    }
  },

  'Piping': function(test) {
    var protocol = new draft76.Protocol();
    var msg_recv = 0;
    protocol.parser.on('message', function(type, message) {
      msg_recv++;
      test.equal(msg_recv, 1);
      test.equal(message, 'test');
    });

    protocol.parser.on('close', function() {
      test.done();
    });

    protocol.pipe(protocol.parser);
    protocol.write('test');
    protocol.close();
  }
};
