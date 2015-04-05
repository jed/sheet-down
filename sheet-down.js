import {Transform} from "stream"
import Worksheet from "google-worksheet-stream"
import {LevelDOWN} from "abstract-stream-leveldown"

const keyEncoding = {
  name: "UInt32BE",
  buffer: true,

  encode(key) {
    if (!Array.isArray(key)) key = [key]

    let buf = new Buffer(4 * key.length)
    key.forEach((x, i) => buf.writeUInt32BE(x, i * 4))

    return buf
  },

  decode(buf) {
    let key = []
    let i = Math.floor(buf.length / 4)

    while (i--) key[i] = buf.readUInt32BE(i * 4)

    if (key.length < 2) key = key[0]

    return key
  }
}

class DOWN extends LevelDOWN {
  constructor(location, {token}) {
    super(location)

    let [spreadsheetId, worksheetId] = location.split("/")
    let options = {token, spreadsheetId, worksheetId}

    this.worksheet = new Worksheet(options)
  }

  _createReadStream(options) {
    let {reverse, limit, keyAsBuffer, valueAsBuffer} = options
    let {valueEncoding} = this

    if (reverse) throw new Error("Reverse not supported.")
    if (limit == null || limit < 0) limit = Infinity

    let minRow, maxRow
    let {lt, lte, gt, gte} = options

    if (gte) minRow = keyEncoding.decode(gte.slice(0, 4))
    if (gt) minRow = keyEncoding.decode(gt.slice(0, 4)) + 1
    if (lte) maxRow = keyEncoding.decode(lte.slice(0, 4))
    if (lt) maxRow = keyEncoding.decode(lt.slice(0, 4)) - 1

    let rs = this._source.createReadStream({minRow, maxRow})
    let t = new Transform({
      objectMode: true,
      transform({key, value}, enc, cb) {
        if (limit) {
          limit--

          key = keyEncoding.encode(key)
          value = valueEncoding.encode(value)

          this.push({key, value})
        }

        cb()
      }
    })

    return rs.pipe(t)
  }

  _createWriteStream(options) {
    let {valueEncoding} = this
    let ws = this._source.createWriteStream()
    let t = new Transform({
      objectMode: true,
      transform({key, value}, enc, cb) {
        key = keyEncoding.decode(key)
        if (value) value = valueEncoding.decode(value)

        this.push({key, value})

        cb()
      }
    })

    t.pipe(ws)
    return t
  }
}

class CellDOWN extends DOWN {
  static get valueEncoding() { return {
    name: "utf8",
    buffer: false,
    encode: x => x,
    decode: x => x
  }}

  constructor(...args) {
    super(...args)

    this._source = this.worksheet.cells
    this.valueEncoding = CellDOWN.valueEncoding
  }
}

class RowDOWN extends DOWN {
  static get valueEncoding() { return {
    name: "json",
    buffer: false,
    encode: JSON.stringify,
    decode: JSON.parse
  }}

  constructor(...args) {
    super(...args)

    this._source = this.worksheet.objects
    this.valueEncoding = RowDOWN.valueEncoding
  }
}

export default {
  CellDOWN: options => ({
    keyEncoding,
    valueEncoding: CellDOWN.valueEncoding,
    db: location => new CellDOWN(location, options)
  }),

  RowDOWN: options => ({
    keyEncoding,
    valueEncoding: RowDOWN.valueEncoding,
    db: location => new RowDOWN(location, options)
  })
}
