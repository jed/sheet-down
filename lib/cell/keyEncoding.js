export default {
  type: "cellKey",

  buffer: true,

  encode(key) {
    let buf = Buffer(4)

    buf.writeUInt16BE(key[0], 0)
    buf.writeUInt16BE(key[1], 2)

    return buf
  },

  decode(buf) {
    return [
      buf.readUInt16BE(0),
      buf.readUInt16BE(2)
    ]
  }
}
