var assert = require('assert');

exports.equalBuffers = function(buf1, buf2, message) {
  if (!buf1['length'] || !buf2['length']) {
    return false;
  } else if (buf1.length !== buf2.length) {
    return false;
  } else {
    for (var i = 0, l = buf1.length; i < l; ++i) {
      if (buf1[i] !== buf2[i]) {
        return false;
      }
    }
    return true;
  }
};
