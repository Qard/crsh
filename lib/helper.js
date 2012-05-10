var path = require('path')
  , crypto = require('crypto')

var helper = {
  realPath: function (file, base) {
    if (file.substring(0, 1) === '.') {
      file = path.join(base || process.cwd(), file)
    }
    return path.normalize(file)
  }

  , md5: function (str) {
    var md5 = crypto.createHash('md5')
    md5.update(str)
    return md5.digest('hex')
  }
  , flatten: function (arr) {
    return (function recurse (a, b) {
      a.forEach(function (v) {
        Array.isArray(v) ? recurse(v, b) : b.push(v)
      })
      return b
    })(arr, [])
  }
  , unique: function (array) {
    var results = []
    array.reduce(function (memo, value, index) {
      if ( ! ~memo.indexOf(value)) {
        memo.push(value)
        results.push(array[index])
      }
      return memo
    }, [])
    return results
  }
}

module.exports = helper