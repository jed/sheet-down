"use strict";

var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

var _slicedToArray = function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { var _arr = []; for (var _iterator = arr[Symbol.iterator](), _step; !(_step = _iterator.next()).done;) { _arr.push(_step.value); if (i && _arr.length === i) break; } return _arr; } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } };

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

var Transform = require("stream").Transform;

var Worksheet = _interopRequire(require("google-worksheet-stream"));

var LevelDOWN = require("abstract-stream-leveldown").LevelDOWN;

var keyEncoding = {
  name: "UInt32BE",
  buffer: true,

  encode: function encode(key) {
    if (!Array.isArray(key)) key = [key];

    var buf = new Buffer(4 * key.length);
    key.forEach(function (x, i) {
      return buf.writeUInt32BE(x, i * 4);
    });

    return buf;
  },

  decode: function decode(buf) {
    var key = [];
    var i = Math.floor(buf.length / 4);

    while (i--) key[i] = buf.readUInt32BE(i * 4);

    if (key.length < 2) key = key[0];

    return key;
  }
};

var valueEncoding = {
  name: "json",
  buffer: false,

  encode: JSON.stringify,

  decode: JSON.parse
};

var RowDOWN = (function (_LevelDOWN) {
  function RowDOWN(location, _ref) {
    var token = _ref.token;

    _classCallCheck(this, RowDOWN);

    _get(Object.getPrototypeOf(RowDOWN.prototype), "constructor", this).call(this, location);

    var _location$split = location.split("/");

    var _location$split2 = _slicedToArray(_location$split, 2);

    var spreadsheetId = _location$split2[0];
    var worksheetId = _location$split2[1];

    var worksheet = new Worksheet({ token: token, spreadsheetId: spreadsheetId, worksheetId: worksheetId });

    this._rows = worksheet.objects;
  }

  _inherits(RowDOWN, _LevelDOWN);

  _createClass(RowDOWN, {
    _createReadStream: {
      value: function _createReadStream(options) {
        var reverse = options.reverse;
        var limit = options.limit;
        var keyAsBuffer = options.keyAsBuffer;
        var valueAsBuffer = options.valueAsBuffer;

        if (reverse) throw new Error("Reverse not supported.");
        if (limit == null || limit < 0) limit = Infinity;

        var minRow = undefined,
            maxRow = undefined;
        var lt = options.lt;
        var lte = options.lte;
        var gt = options.gt;
        var gte = options.gte;

        if (gte) minRow = keyEncoding.decode(gte.slice(0, 4));
        if (gt) minRow = keyEncoding.decode(gt.slice(0, 4)) + 1;
        if (lte) maxRow = keyEncoding.decode(lte.slice(0, 4));
        if (lt) maxRow = keyEncoding.decode(lt.slice(0, 4)) - 1;

        var rs = this._rows.createReadStream({ minRow: minRow, maxRow: maxRow });
        var t = new Transform({
          objectMode: true,
          transform: function transform(_ref, enc, cb) {
            var key = _ref.key;
            var value = _ref.value;

            if (limit) {
              limit--;

              key = keyEncoding.encode(key);
              value = valueEncoding.encode(value);

              this.push({ key: key, value: value });
            }

            cb();
          }
        });

        return rs.pipe(t);
      }
    },
    _createWriteStream: {
      value: function _createWriteStream(options) {}
    }
  });

  return RowDOWN;
})(LevelDOWN);

module.exports = {
  RowDOWN: function (options) {
    return {
      keyEncoding: keyEncoding,
      valueEncoding: valueEncoding,
      db: function (location) {
        return new RowDOWN(location, options);
      }
    };
  }
};

