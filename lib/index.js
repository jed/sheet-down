import CellDOWN from "./cell/LevelDOWN"

export default {
  CellDOWN: token => location => new CellDOWN(location, token)
}
