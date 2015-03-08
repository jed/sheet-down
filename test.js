import fs from "fs"
import {deepEqual} from "assert"
import levelup from "levelup"
import {Token} from "google-oauth-jwt-stream"
import concat from "concat-stream"
import {CellDOWN} from "./lib"
import keyEncoding from "./lib/cell/keyEncoding"

let email = process.env.GOOGLE_OAUTH_EMAIL
let key = Buffer(process.env.GOOGLE_OAUTH_KEY, "base64")
let scopes = ["https://spreadsheets.google.com/feeds"]
let token = new Token(email, key, scopes)

let location = "1QuqgvEo-fk62heKg3tXCHXC-L_ZcJvOWsYEgOVuxUAU/od6"
let db = new CellDOWN(token)

let table = levelup(location, {db, keyEncoding})
let mtime = Date.now().toString()

table.batch()
  .put([1, 1], "name")
  .put([1, 2], "github handle")
  .put([1, 3], "mtime")
  .put([2, 1], "Jed Schmidt")
  .put([2, 2], "@jed")
  .put([2, 3], mtime)
  .put([3, 1], "Brian J. Brennan")
  .put([3, 2], "@brianloveswords")
  .put([3, 3], mtime)
  .write(err => {
    if (err) throw err

    let ws = concat(cells => deepEqual(cells, [
      {key: [1, 1], value: "name"             },
      {key: [1, 2], value: "github handle"    },
      {key: [1, 3], value: "mtime"            },
      {key: [2, 1], value: "Jed Schmidt"      },
      {key: [2, 2], value: "@jed"             },
      {key: [2, 3], value: mtime              },
      {key: [3, 1], value: "Brian J. Brennan" },
      {key: [3, 2], value: "@brianloveswords" },
      {key: [3, 3], value: mtime              }
    ]))

    table.createReadStream().pipe(ws)
  })
