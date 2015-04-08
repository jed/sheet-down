import fs from "fs"
import {deepEqual} from "assert"
import levelup from "levelup"
import {Token} from "google-oauth-jwt-stream"
import concat from "concat-stream"
import {CellDOWN, RowDOWN} from "./sheet-down"

let key

try { key = Buffer(process.env.GOOGLE_OAUTH_KEY, "base64") }
catch (e) { key = fs.readFileSync("./key.pem") }

let email = "91515745676-4gfajos94ps431fm229noqp5rg6hc4og@developer.gserviceaccount.com"
let scopes = ["https://spreadsheets.google.com/feeds"]
let token = new Token(email, key, scopes)

let location = "1ae-WBL86c4wEUB5fEbsW9G1Y6D7FKnX6IvNmpVCv79M/od6"
let cells = levelup(location, new CellDOWN({token}))
let rows = levelup(location, new RowDOWN({token}))

let mtime = new Date().toString()

cells.batch()
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

    let oncells = data => deepEqual(data, [
      {key: [1, 1], value: "name"             },
      {key: [1, 2], value: "github handle"    },
      {key: [1, 3], value: "mtime"            },
      {key: [2, 1], value: "Jed Schmidt"      },
      {key: [2, 2], value: "@jed"             },
      {key: [2, 3], value: mtime              },
      {key: [3, 1], value: "Brian J. Brennan" },
      {key: [3, 2], value: "@brianloveswords" },
      {key: [3, 3], value: mtime              }
    ])

    let onrows = data => deepEqual(data, [
      {key: 2, value: {"name": "Jed Schmidt"     , "github handle": "@jed"            , "mtime": mtime}},
      {key: 3, value: {"name": "Brian J. Brennan", "github handle": "@brianloveswords", "mtime": mtime}}
    ])

    setTimeout(() => {
      cells.createReadStream().pipe(concat(oncells))
      rows.createReadStream().pipe(concat(onrows))
    }, 2500)
  })
