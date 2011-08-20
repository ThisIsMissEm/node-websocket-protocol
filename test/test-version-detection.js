var Protocol = require('../lib/websocket-protocol');

module.exports = {
  'isWebSocketRequest(req)': {
    'valid request': function(test) {
      var req = {
        httpVersion: '1.1',
        headers: {
          upgrade: 'WebSocket',
          connection: 'Upgrade'
        },
        method: 'GET'
      };

      test.equal(true, Protocol.isWebSocketRequest(req));
      test.done();
    },

    'wrong HTTP version': function(test) {
      var req = {
        httpVersion: '1.0',
        headers: {
          upgrade: 'WebSocket',
          connection: 'Upgrade'
        },
        method: 'GET'
      };

      test.equal(false, Protocol.isWebSocketRequest(req));
      test.done();
    },

    'wrong HTTP method': function(test) {
      var req = {
        httpVersion: '1.1',
        headers: {
          upgrade: 'WebSocket',
          connection: 'Upgrade'
        },
        method: 'POST'
      };

      test.equal(false, Protocol.isWebSocketRequest(req));
      test.done();
    },

    'missing HTTP Header': {
      'connection': function(test) {
        var req = {
          httpVersion: '1.1',
          headers: {
            upgrade: 'WebSocket'
          },
          method: 'GET'
        };

        test.equal(false, Protocol.isWebSocketRequest(req));
        test.done();
      },

      'upgrade': function(test) {
        var req = {
          httpVersion: '1.1',
          headers: {
            connection: 'Upgrade'
          },
          method: 'GET'
        };

        test.equal(false, Protocol.isWebSocketRequest(req));
        test.done();
      }
    },

    'incorrect value for HTTP header': {
      'connection': function(test) {
        var req = {
          httpVersion: '1.1',
          headers: {
            upgrade: 'WebSocket',
            connection: 'Keep-Alive'
          },
          method: 'GET'
        };

        test.equal(false, Protocol.isWebSocketRequest(req));
        test.done();
      },

      'upgrade': function(test) {
        var req = {
          httpVersion: '1.1',
          headers: {
            upgrade: 'Something',
            connection: 'Upgrade'
          },
          method: 'GET'
        };

        test.equal(false, Protocol.isWebSocketRequest(req));
        test.done();
      }
    }
  },

  'getVersion(req)': {
    'draft-hixie-75': function(test) {
      var req = {
        httpVersion: '1.1',
        headers: {
          upgrade: 'WebSocket',
          connection: 'Upgrade'
        },
        method: 'GET'
      };

      test.equal('draft-hixie-75', Protocol.getVersion(req));
      test.done();
    },

    'draft-hixie-76': function(test) {
      var req = {
        httpVersion: '1.1',
        headers: {
          upgrade: 'WebSocket',
          connection: 'Upgrade',
          'sec-websocket-key1': '4 @1  46546xW%0l 1 5',
          'sec-websocket-key2': '12998 5 Y3 1  .P00'
        },
        method: 'GET'
      };

      test.equal('draft-hixie-76', Protocol.getVersion(req));
      test.done();
    },

    'draft-ietf-07': function(test) {
      var req = {
        httpVersion: '1.1',
        headers: {
          upgrade: 'WebSocket',
          connection: 'Upgrade',
          'sec-websocket-key': 'dGhlIHNhbXBsZSBub25jZQ==',
          'sec-websocket-version': '7'
        },
        method: 'GET'
      };

      test.equal('draft-ietf-07', Protocol.getVersion(req));
      test.done();
    },

    'draft-ietf-08': function(test) {
      var req = {
        httpVersion: '1.1',
        headers: {
          upgrade: 'WebSocket',
          connection: 'Upgrade',
          'sec-websocket-key': 'dGhlIHNhbXBsZSBub25jZQ==',
          'sec-websocket-version': '8'
        },
        method: 'GET'
      };

      test.equal('draft-ietf-08', Protocol.getVersion(req));
      test.done();
    }
  }
};
