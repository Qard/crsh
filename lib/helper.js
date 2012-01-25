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
}

module.exports = helper