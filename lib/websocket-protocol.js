var ProtocolVersions = {};
var Protocols = {};

var WS_DRAFT_08 = 'draft-ietf-08';
var WS_DRAFT_07 = 'draft-ietf-07';
var WS_DRAFT_76 = 'draft-hixie-76';
var WS_DRAFT_75 = 'draft-hixie-75';

var WS_DRAFT_NOT_SUPPORTED = 'not-supported';

ProtocolVersions[WS_DRAFT_08] = WS_DRAFT_08;
ProtocolVersions[WS_DRAFT_07] = WS_DRAFT_07;
ProtocolVersions[WS_DRAFT_76] = WS_DRAFT_76;
ProtocolVersions[WS_DRAFT_75] = WS_DRAFT_75;

Protocols[WS_DRAFT_08] = require('./draft-ietf-08');
Protocols[WS_DRAFT_07] = require('./draft-ietf-07');
Protocols[WS_DRAFT_76] = require('./draft-hixie-76');
Protocols[WS_DRAFT_75] = require('./draft-hixie-75');


exports.ProtocolVersions = ProtocolVersions;
exports.Protocols = Protocols;


/**
 * Returns a boolean as to whether a given request is a request
 * for a WebSocket connection.
 *
 * @param {http.Request} request The request to check.
 * @returns {Boolean}
 */
exports.isWebSocketRequest = function isWebSocketRequest(req) {
  return (
    req.httpVersion === '1.1' &&
    req.method === 'GET' &&
    typeof req.headers['upgrade'] !== 'undefined' &&
    req.headers.upgrade.toLowerCase() === 'websocket' &&
    typeof req.headers['connection'] !== 'undefined' &&
    req.headers.connection.toLowerCase() === 'upgrade'
  );
};


exports.getVersion = function getVersion(req) {
  // draft-ietf-04+ added these headers:
  if (req.headers['sec-websocket-key'] && req.headers['sec-websocket-version']) {
    // draft-ietf-08 to draft-ietf-10 identify as websocket-version 8:
    if (req.headers['sec-websocket-version'] === '8') {
      return WS_DRAFT_08;
    }

    // draft-ietf-07 is websocket-version 7:
    if (req.headers['sec-websocket-version'] === '7') {
      return WS_DRAFT_07;
    }

    return WS_DRAFT_NOT_SUPPORTED;
  }

  // draft-hixie-76 added the sec-websocket-key1 header:
  if (req.headers['sec-websocket-key1']) {
    return WS_DRAFT_76;
  }

  // fallback to draft-75 otherwise:
  return WS_DRAFT_75;
};
