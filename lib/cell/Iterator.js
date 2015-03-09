import {get} from "https"
import {stringify} from "querystring"
import {AbstractIterator} from "abstract-leveldown"
import FeedParser from "feedparser"
import {encode, decode} from "./keyEncoding"

export default class extends AbstractIterator {
  constructor(db, options) {
    this._db = db

    let {reverse, limit, gt, gte, lt, lte} = options

    if (reverse) {
      throw new Error("Google Spreadsheets do not support reverse iteration.")
    }

    this._remaining = limit >= 0 ? limit : Infinity

    let minRow, maxRow, minCol, maxCol

    if (gt ) [minRow, maxRow] = decode(gt ).map(x => x + 1)
    if (lt ) [minCol, maxCol] = decode(lt ).map(x => x - 1)
    if (gte) [minRow, maxRow] = decode(gte)
    if (lte) [minCol, maxCol] = decode(lte)

    let query = {}
    if (minRow) query["min-row"] = minRow
    if (maxRow) query["max-row"] = maxRow
    if (minCol) query["min-col"] = minCol
    if (maxCol) query["max-col"] = maxCol
    let search = "?" + stringify(query)

    this._options = {
      headers: {
        "Content-Type": "application/atom+xml",
        "GData-Version": "3.0",
        "If-Match": "*"
      },
      hostname: "spreadsheets.google.com",
      path: `/feeds/cells/${this._db.location}/private/full${search}`
    }
  }

  _open() {
    this._db._token.get((err, token) => {
      if (err) return this._cb(err)

      let {token_type, access_token} = token
      this._options.headers.Authorization = `${token_type} ${access_token}`

      get(this._options, res => {
        if (res.statusCode >= 300) {
          let message = ""

          return res
            .on("data", data => message += data)
            .on("end", () => this._cb(new Error(message)))
        }

        this._stream = res.pipe(new FeedParser)

        this._stream.on("readable", () => {
          this._get()
        })

        this._stream.on("end", () => {
          this._done = true
          this._get()
        })
      })
    })
  }

  _nextRaw(cb) {
    this._cb = cb

    this._stream
      ? this._get()
      : this._open()
  }

  _next(cb) {
    this._nextRaw((err, key, value) => {
      if (err) return cb(err)

      if (!key) return cb()

      cb(null, encode(key), JSON.stringify(value))
    })
  }

  _get() {
    let {_cb, _stream, _done, _lte, _gte, _remaining} = this

    if (!_cb || !_stream) return

    if (_done || !_remaining) return setImmediate(_cb)

    let data = _stream.read()

    if (!data) return

    let {row, col, inputvalue, numericvalue} = data["gs:cell"]["@"]

    let key = [row, col]
    let value = numericvalue
      ? parseFloat(numericvalue, 10)
      : inputvalue

    delete this._cb
    this._remaining--
    setImmediate(_cb, null, key, value)
  }
}
