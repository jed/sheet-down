import {request} from "https"
import {Gzip} from "zlib"
import {AbstractChainedBatch} from "abstract-leveldown"
import FeedParser from "feedparser"
import {decode} from "./keyEncoding"

export default class extends AbstractChainedBatch {
  constructor(db) {
    this._db = db
    this._body = new Gzip

    this._body.write(`
      <feed
        xmlns="http://www.w3.org/2005/Atom"
        xmlns:batch="http://schemas.google.com/gdata/batch"
        xmlns:gs="http://schemas.google.com/spreadsheets/2006">
        <id>https://spreadsheets.google.com/feeds/cells/${this._db.location}/private/full</id>
    `)
  }

  _put(key, value, options) {
    let [row, col] = decode(key)

    let cell = `R${row}C${col}`
    let href = `https://spreadsheets.google.com/feeds/cells/${this._db.location}/private/full/${cell}`

    this._body.write(`
      <entry>
        <batch:id>${cell}</batch:id>
        <batch:operation type="update"/>
        <id>${href}</id>
        <link
          rel="edit"
          type="application/atom+xml"
          href="${href}"/>
        <gs:cell
          row="${row}"
          col="${col}"
          inputValue="${value}"/>
      </entry>
    `)
  }

  _del(key, options) {
    this._put(key, "", options)
  }

  _clear() {
    this.constructor.call(this)
  }

  _write(cb) {
    this._body.end(`
      </feed>
    `)

    this._db._token.get((err, {token_type, access_token}) => {
      if (err) return cb(err)

      let options = {
        method: "post",
        headers: {
          "Authorization": `${token_type} ${access_token}`,
          "Content-Type": "application/atom+xml",
          "GData-Version": "3.0",
          "If-Match": "*",
          "Content-Encoding": "gzip"
        },
        hostname: "spreadsheets.google.com",
        path: `/feeds/cells/${this._db.location}/private/full/batch`
      }

      let onresponse = res => {
        if (res.statusCode >= 300) {
          return cb(new Error(`HTTP error! ${res.statusCode} ${res.statusMessage}`));
        }
        let reasons = []

        let ondata = data => {
          let interruption = data["batch:interrupted"]
          if (interruption) {
            return reasons.push(interruption["@"].reason)
          }

          let status = data["batch:status"]["@"]
          if (status.code !== "200") {
            return reasons.push(status.reason)
          }
        }

        let onend = () => {
          reasons.length
            ? cb(new Error(reasons.join("\n\n")))
            : cb(null)
        }

        res
          .pipe(new FeedParser)
          .on("data", ondata)
          .on("end", onend)
      }

      let req = request(options, onresponse)
      this._body.pipe(req)
    })
  }
}
