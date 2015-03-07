import {AbstractLevelDOWN} from "abstract-leveldown"
import Iterator from "./Iterator"
import ChainedBatch from "./ChainedBatch"

export default class LevelDOWN extends AbstractLevelDOWN {
  constructor(location, token) {
    if (location.join) location = location.join("/")

    super(location)

    this._token = token
  }

  _get(key, options, cb) {
    this
      ._iterator({gte: key, lte: key})
      .next((err, data) => {
        if (!err && !data) err = new Error("NotFound")

        return cb(err, data)
      })
  }

  _put(key, value, options, cb) {
    this._batch([{type: "put", key, value}], options, cb)
  }

  _del(key, options, cb) {
    this._batch([{type: "del", key}], options, cb)
  }

  _iterator(options) {
    return new Iterator(this, options)
  }

  _chainedBatch() {
    return new ChainedBatch(this)
  }

  _batch(ops, options, cb) {
    let batch = this._chainedBatch()

    for (let {type, key, value} of ops) {
      try {
        type == "del"
          ? batch._del(key, options)
          : batch._put(key, value, options)
      }

      catch (err) { cb(err) }
    }

    batch._write(cb)
  }
}
