sheet-down
==========

[![Build Status](https://travis-ci.org/jed/sheet-down.svg)](https://travis-ci.org/jed/sheet-down)

A [Google Spreadsheet][] implementation of [leveldown][].

This library uses [abstract-leveldown][] to turn a worksheet within a Google Spreadsheet into a [leveldown][]-compatible store for use with [levelup][]. It was built to provide a convenient and familiar UI for two use cases:

1. **As a write-only store**, to enable simple data entry without having to create or maintain a custom CRUD app with its own authentication/authorization.
2. **As a read-only view** of an upstream data store, with built in sort and filter functionality.

Keep in mind that there are some differences between LevelDB and Google Spreadsheets. For example, unlike LevelDB, Google Spreadsheets does not guarantee batch write atomicity, and does not snapshot reads.

Currently only [io.js][] has been tested.

Example
-------

```javascript
import fs from "fs"
import levelup from "levelup"
import {Token} from "google-oauth-jwt-stream"
import {CellDOWN} from "sheet-down"

let email = "xxx...xxx@developer.gserviceaccount.com"
let key = fs.readFileSync("./key.pem")
let scopes = ["https://spreadsheets.google.com/feeds"]
let token = new Token(email, key, scopes)

let location = "<spreadsheet-id>/<worksheet-id>"
let table = levelup(location, new CellDOWN({token}))

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

Installation
------------

    npm install sheet-down

Setup
-----

Follow [these steps](SETUP.md) to create and share a spreadsheet that this library can access, and get its spreadsheet and worksheet IDs.

API
---

### import {CellDOWN, RowDOWN} from "sheet-down"

This backend provides two interfaces, for each cells and rows. Each of these constructors take an object whose `token` property is an instance of [google-oauth-jwt-stream][], and return an object whose `db`, `keyEncoding`, and `valueEncoding` properties match those accepted by [levelup][].

### let cells = levelup("spreadsheetId/worksheetId", CellDOWN({token}))

This creates a backend that operates on a Google worksheet by cell. Each key is an 8-byte buffer of two [UInt32BE][]s that specify the row number and column number, and each value is a utf-8 string. Unless otherwise specified, cell keys are transparently converted from integer arrays by the provided `keyEncoding`.

### let rows = levelup("spreadsheetId/worksheetId", RowDOWN({token}))

This creates a backend that operates on a Google worksheet by row. Each key is a 4-byte [UInt32BE][] that specifies the row number, and each value is a JSON-encoded string. Unless otherwise specified, cell keys are transparently converted from integers by the provided `keyEncoding`.

This backend is built on top of the cell interface by using the first row of the worksheet as a schema, grouping all cells in a given row into an array, and then using the schema keys to replace the column numbers.

[UInt32BE]: https://iojs.org/api/buffer.html#buffer_buf_readuint32be_offset_noassert
[google-oauth-jwt-stream]: https://github.com/jed/google-oauth-jwt-stream
[Google Spreadsheet]: https://docs.google.com/spreadsheets
[abstract-leveldown]: https://github.com/rvagg/abstract-leveldown
[levelup]: https://github.com/rvagg/node-levelup
[leveldown]: https://github.com/rvagg/node-leveldown
[io.js]: https://iojs.org
