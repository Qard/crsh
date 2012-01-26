var helper = require('./helper')
  , Files = require('./files')
  , Watch = require('./watcher')
  , uglify = require('uglify-js')
  , path = require('path')
  , jsp = uglify.parser
  , pro = uglify.uglify
  , coffee = null
  , stylus = null

/**
 * Construct a Crsh block
 * 
 * @param array
 *    Array of files to minify and combine
 */
function Crsh (path, list) {
  var self = this

  this.format = null

  // Path is optional
  if (typeof path !== 'string') {
    list = path
    path = Crsh.path
  }
  this.path = path

  // Don't use watcher in production
  if (process.env.NODE_ENV !== 'production') {
    this.watcher = new Watch(path)
  }

  // Populate list, if supplied.
  if (typeof list !== 'undefined') {
    this.list = []
    list.forEach(function (file) {
      self.add(file)
    })

    this.compile()
  }

  // Run the compiler when a change occurs
  if (this.watcher) {
    this.watcher.on('change', function () {
      self.compile()
    })
  }
}


// Default to current working directory
Crsh.path = process.cwd()


/**
 * Add a file to the watcher
 * 
 * @param string
 *    Relative or absolute path to file
 */
Crsh.prototype.add = function (f) {
  f = helper.realPath(f, this.path)
  var format = Crsh.getFormat(f)

  // Mixing formats is bad
  if (this.format && this.format !== format) {
    throw new Error('Can not mix formats!')
  }

  // Make sure format is set
  this.format || (this.format = format)

  // Ensure necessary parsers are available
  this.prepParsers(f)

  // Add to list
  this.list.push(f)

  // Add to watcher
  this.watcher && this.watcher.add(f)

  return this
}

/**
 * Determines if a parser library is need and loads it
 * 
 * @param string
 *    File name or path
 */
Crsh.prototype.prepParsers = function (file) {
  var ext = path.extname(file)

  // Needs coffeescript
  if ('.coffee' === ext) {
    try {
      coffee = require('coffee-script')
    } catch (e) {
      throw new Error('coffee-script not installed')
    }
  }

  // Needs stylus
  if ('.styl' === ext) {
    try {
      stylus = require('stylus')
    } catch (e) {
      throw new Error('stylus not installed')
    }
  }
}

/**
 * Attempt to identify file type
 * 
 * @param string
 *    File name or path
 */
Crsh.getFormat = function (file) {
  var ext = path.extname(file)
  return ['.js','.coffee'].indexOf(ext) >= 0 ? 'js'
    : ['.css','.styl'].indexOf(ext) >= 0 ? 'css'
    : false
}

// Aliases for getFormat
Crsh.isJs = function (f) { return 'js' === Crsh.getFormat(f) }
Crsh.isCss = function (f) { return 'css' === Crsh.getFormat(f) }


/**
 * Remove a file from the watcher
 * 
 * @param string
 *    Relative or absolute path to file
 */
Crsh.prototype.remove = function (f) {
  f = helper.realPath(f, this.path)

  // Remove from list
  var p = this.list.indexOf(f)
  if (p > -1) {
    this.list.splice(p, 1)
  }

  // Remove from watcher
  this.watcher && this.watcher.remove(f)

  return this
}


/**
 * Merge and minify all the files
 */
Crsh.prototype.compile = function (cb) {
  var isProd = process.env.NODE_ENV === 'production'
    , list = this.list
    , self = this
  
  cb || (cb = function () {})

  // Generate name only when a compile occurs
  this.name = 'crsh-' + helper.md5(this.list.join(',')) + '.' + this.format
  
  // Load all the files into a hash
  Files.load(list, function (err, files) {
    if (err) cb(err)

    // Merge all the files
    var data = list.map(function (file) {

      // Compile coffeescript files
      if (path.extname(file) === '.coffee') {
        return coffee.compile(files[file].toString())
      }

      // Compile stylus files
      if (path.extname(file) === '.styl') {
        var css = ''
        stylus(files[file].toString())
          .set('compress', isProd)
          .set('filename', file)
          .render(function (err, v) {
            css = v
          })

        return css
      }

      // Return normal files as-is
      return files[file]
    }).join('')

    // Only uglify in production
    if (isProd && this.format === 'js') {
      var ast = jsp.parse(data)
      ast = pro.ast_mangle(ast)
      ast = pro.ast_squeeze(ast)
      data = pro.gen_code(ast)
    }

    // Write merged and uglified data to file
    var p = path.join(self.path, self.name)
    Files.write(p, data, function (err) {
      if (err) return cb(err)
      self.lastChange = Date.now()
      cb()
    })
  })
}


/**
 * Get URL with timestamp for cachebusting
 */
Crsh.prototype.getUrl = function () {
  return this.name + '?' + this.lastChange
}


/**
 * Convenient constructor alias
 */
Crsh.createBlock = function (path, list) {
  return new Crsh(path, list)
}


/**
 * Handy middleware for making named crsh instances
 * 
 * @param object
 *    Hash of crsh blocks to expose in request
 * 
 * @example
 *   app.use(crsh.middleware({
 *     libs: ['jquery.js','underscore.js','backbone.js']
 *   }))
 */
Crsh.middleware = function (path, blocks) {

  // Path is optional
  if (typeof path !== 'string') {
    blocks = path
    path = Crsh.path
  }

  // Build named Crsh blocks
  var list = {}
  for (var name in blocks) {
    list[name] = new Crsh(path, blocks[name])
  }

  // Expose named list to req object
  return function (req, res, next) {
    req.crsh = list

    // Expose named list to views, if possible
    if (typeof res.local === 'function') {
      for (var i in list) {
        res.local('crsh_'+i, list[i].getUrl())
      }
    }

    // Continue
    next()
  }
}


// Export the interface
module.exports = Crsh