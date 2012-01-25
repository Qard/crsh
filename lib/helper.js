var path = require('path')

var helper = {
  rchar: function () {
    var n = Math.floor(Math.random() * 62)
    return (n < 10) ? n : String.fromCharCode(n + ((n < 36) ? 55 : 61))
  }

  , rstring: function (l) {
      var s = []
      while (l--) { s.push(helper.rchar()) }
      return s.join('');
  }
  
  , realPath: function (file, base) {
    if (file.substring(0, 1) === '.') {
      file = path.join(base || process.cwd(), file)
    }
    return path.normalize(file)
  }
}

module.exports = helper