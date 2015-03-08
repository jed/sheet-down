SheetDOWN
=========

*STATUS: USE AT YOUR OWN RISK*

[![Build Status](https://travis-ci.org/jed/sheet-down.svg)](https://travis-ci.org/jed/sheet-down)

A [Google Spreadsheet][] implementation of [leveldown][].

This library uses [abstract-leveldown][] to turn a worksheet within a Google Spreadsheet into a leveldown-compatible store for use with [levelup][].

Keep in mind that there are some differences between LevelDB and Google Spreadsheets. For example, unlike LevelDB, Google Spreadsheets does not guarantee batch write atomicity, and does not snapshot reads.

A row-based interface is coming soon, but currently only a cell-based interface is provided. Each cell is addressed by a compound `[row, column]` key, encoded as a 4-byte buffer of two `UInt16BE`s, but this encoding can be handled transparently using the included `keyEncoding`, as shown in the following example.

Installation
------------

    npm install sheet-down

Example
-------

```javascript
import fs from "fs"
import levelup from "levelup"
import {Token} from "google-oauth-jwt-stream"
import {CellDOWN} from "sheet-down"
import keyEncoding from "sheet-down/dist/cell/keyEncoding"

let email = "xxx...xxx@developer.gserviceaccount.com"
let key = fs.readFileSync("./key.pem")
let scopes = ["https://spreadsheets.google.com/feeds"]
let token = new Token(email, key, scopes)

let location = "<spreadsheet-id>/<worksheet-id>"
let db = new CellDOWN(token)

let table = levelup(location, {db, keyEncoding})

table.batch()
  // put header row
  .put([1, 1], "name")
  .put([1, 2], "github handle")

  // put data rows
  .put([2, 1], "Jed Schmidt")
  .put([2, 2], "@jed")
  .put([3, 1], "Brian J. Brennan")
  .put([3, 2], "@brianloveswords")

  .write(err => {
    // read cells
    table.createReadStream().on("data", console.log)

    // { key: [ 1, 1 ], value: 'name' }
    // { key: [ 1, 2 ], value: 'github handle' }
    // { key: [ 2, 1 ], value: 'Jed Schmidt' }
    // { key: [ 2, 2 ], value: '@jed' }
    // { key: [ 3, 1 ], value: 'Brian J. Brennan' }
    // { key: [ 3, 2 ], value: '@brianloveswords' }
  })
```

![screenshot](https://cloud.githubusercontent.com/assets/4433/6543812/447a0d92-c4fb-11e4-80e7-cf8ff1589dc3.png)

[Google Spreadsheet]: https://docs.google.com/spreadsheets
[abstract-leveldown]: https://github.com/rvagg/abstract-leveldown
[levelup]: https://github.com/rvagg/node-levelup
[leveldown]: https://github.com/rvagg/node-leveldown
