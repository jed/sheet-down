import {get} from "https"
import {stringify} from "querystring"
import {AbstractIterator} from "abstract-leveldown"
import FeedParser from "feedparser"
import {encode, decode} from "./keyEncoding"

export default class Iterator extends AbstractIterator {
  constructor(db, options) {
    this._db = db

    let {reverse, gt, gte, lt, lte, limit} = options

    if (gt) gt = decode(gt), gt[1]++, gte = encode(gt)
    if (lt) lt = decode(lt), lt[1]--, lte = encode(lt)

    this._gte = gte
    this._lte = lte

    this._reverse = reverse
    this._remaining = limit >= 0 ? limit : Infinity
    this._next = this._open
  }

  _open(cb) {
    delete this._next
    this._next(cb)

    let {_reverse, _gte, _lte} = this

    if (_reverse) {
      return cb(new Error("Google Spreadsheets do not support reverse iteration."))
    }

    let query = {}

    if (_gte) {
      let [row, col] = decode(_gte)

      if (row > 0 || row < 65001) query["min-row"] = row
      else return cb(new Error(`Out-of-range gte row: ${row}`))

      if (col > 0 || col < 65001) {}
      else return cb(new Error(`Out-of-range gte col: ${col}`))
    }

    if (_lte) {
      let [row, col] = decode(_lte)

      if (row > 0 || row < 65001) query["max-row"] = row
      else return cb(new Error(`Out-of-range lte row: ${row}`))

      if (col > 0 || col < 65001) {}
      else return cb(new Error(`Out-of-range lte col: ${col}`))
    }

    let search = `?${stringify(query)}`

    this._db._token.get((err, token) => {
      if (err) return cb(err)

      let {token_type, access_token} = token
      let options = {
        headers: {
          "Authorization": `${token_type} ${access_token}`,
          "Content-Type": "application/atom+xml",
          "GData-Version": "3.0",
          "If-Match": "*"
        },
        hostname: "spreadsheets.google.com",
        path: `/feeds/cells/${this._db.location}/private/full${search}`
      }

      get(options, res => {
        if (res.statusCode >= 300) {
          return cb(new Error(`HTTP error! ${res.statusCode} ${res.statusMessage}`));
        }
        this._stream = res.pipe(new FeedParser)

        this._stream.on("readable", () => {
          this._check()
        })

        this._stream.on("end", () => {
          this._ended = true
          this._check()
        })
      })
    })
  }

  _next(cb) {
    this._cb = cb
    this._check()
  }

  _check() {
    let {_cb, _stream, _ended, _lte, _gte, _remaining} = this

    if (!_cb || !_stream) return

    if (_ended || !_remaining) return _cb()

    let data = _stream.read()

    if (!data) return

    let {row, col, inputvalue, numericvalue} = data["gs:cell"]["@"]
    let key = encode([row, col].map(Number))

    if (_gte && key.compare(_gte) < 0) return this._check()
    if (_lte && _lte.compare(key) < 0) return this._check()

    let value = numericvalue ? parseFloat(numericvalue, 10) : inputvalue

    delete this._cb
    this._remaining--
    _cb(null, key, value)
  }
}
