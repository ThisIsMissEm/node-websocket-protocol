var draft76 = require('../../lib/protocols/draft76');
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
    
      protocol.on('data', function(data) {
        test.equal(data, '\u0000test\uffff');
        test.done();
      });
    
      protocol.write('test');
    },
  
    'close': function(test) {
      var protocol = new draft76.Protocol();
    
      protocol.on('data', function(data) {
        test.equal(protocol.readable, false);
        test.equal(data, '\uffff\u0000');
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
      test.equal(protocol.parser._parseState, 0);
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

      protocol.parser.write([
        0x00, 0x68, 0x65, 0x6c,
        0x6c, 0x6f, 0x20, 0x77,
        0x6f, 0x72, 0x6c, 0x64,
        0xFF
      ]);
    },

    'chunked writes': function(test) {
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
      protocol.parser.write([
        0x00, 0x68, 0x65, 0x6c, 0x6c, 0x6f
      ]);

      test.equal(protocol.parser.drainable, true);

      process.nextTick(function() {
        protocol.parser.write([
          0x20, 0x77, 0x6f, 0x72, 0x6c, 0x64, 0xFF
        ]);
      });
    },

    'close frame': function(test) {
      var protocol = new draft76.Protocol();

      protocol.parser.on('close', function() {
        test.equal(protocol.parser.writable, false);
        test.done();
      });

      test.equal(protocol.parser.writable, true);

      protocol.parser.write([0xFF, 0x00]);
    },

    'chunked close frame': function(test) {
      var protocol = new draft76.Protocol();
      protocol.parser.on('close', function() {
        test.equal(protocol.parser.writable, false);
        test.done();
      });

      test.equal(protocol.parser.writable, true);

      protocol.parser.write([0xFF]);
      process.nextTick(function() {
        protocol.parser.write([0x00]);
      });
    }
  },
  
  'Piping': function() {
    var protocol = new draft76.Protocol();
    var msg_recv = 0;
    protocol.parser.on('message', function(type, message) {
      msg_recv++;
      test.equal(msg_recv, 1);
      test.equal(message, 'test');
      console.log("parser: message");
    });
    
    protocol.parser.on('close', function() {
      test.done();
    });
    
    protocol.pipe(protocol.parser);
    protocol.write('test');
    console.log(protocol.parser._queue);
    console.log(protocol.parser._buffer);
    protocol.close();
  }
};
