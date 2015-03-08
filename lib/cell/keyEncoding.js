export default {
  type: "cellKey",

  buffer: true,

  encode(key) {
    let buf = Buffer(key.length * 4)

    key.forEach((num, i) => buf.writeUInt32BE(num, i * 4))

    return buf
  },

  decode(buf) {
    let key = Array.apply(null, Array(buf.length / 4))

    key.forEach((_, i) => key[i] = buf.readUInt32BE(i * 4))

    return key
  }
}
