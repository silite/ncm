const fs = require('fs')

function readFile(filename) {
  try {
    return JSON.parse(fs.readFileSync(filename, 'utf-8'))
  } catch (e) {
    return []
  }
}

function writeWholeFile(filename, content, callback = (err) => {}) {
  fs.writeFile(filename, content, callback)
}

module.exports = {
  readFile,
  writeWholeFile,
}
