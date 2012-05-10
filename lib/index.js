var helper = require('./helper')
  , Files = require('./files')
  , Watch = require('./watcher')
  , uglify = require('uglify-js')
  , async = require('async')
  , path = require('path')
  , jsp = uglify.parser
  , pro = uglify.uglify
  , coffee = null
  , stylus = null
  , isProd = process.env.NODE_ENV === 'production'

/**
 * Construct a Crsh block
 * 
 * @param array
 *    Array of files to minify and combine
 */
function Crsh (path, list) {
  var self = this

  this.format = null
  this.list = []

  // Path is optional
  if (typeof path !== 'string') {
    list = path
    path = Crsh.path
  }
  this.path = path

  // Don't use watcher in production
  if ( ! isProd) {
    this.watcher = new Watch(path)
  }

  // Populate list, if supplied.
  if (typeof list !== 'undefined') {
    list.forEach(function (file) {
      self.add(file)
    })

    this.compile(function (err) {
      if (err) { throw new Error(err) }
    })
  }

  // Run the compiler when a change occurs
  if (this.watcher) {
    this.watcher.on('change', function () {
      self.compile(function (err) {
        if (err) { throw new Error(err) }
      })
    })
  }
}


// Default to current working directory
Crsh.path = process.cwd()


/**
 * Filters
 */
Crsh.prototype.filters = {}


/**
 * Add a file type filter
 * 
 * @param string
 *    File extension to identify type by
 * 
 * @param function
 *    Filter construction closure
 */
Crsh.prototype.addFilter = function (type, fn) {
  type = noDot(type)
  this.filters[type] = fn.length ? fn : fn.call(this)
  return this
}


/**
 * Find an existing file type filter
 * 
 * @param string
 *    The extension to search with
 */
Crsh.prototype.findFilter = function (type) {
  type = noDot(type)
  return this.filters[type] || function (file, next) {
    next(null, file)
  }
}


/**
 * Filter presets
 */
Crsh.coffee = function () {
  try {
    var coffee = require('coffee-script')
  } catch (e) {
    throw new Error('coffee-script not installed')
  }

  return function () {
    this.addType('js', 'coffee')

    return function (file, next) {
      process.nextTick(function () {
        try {
          var res = coffee.compile(file)
          next(null, res)
        } catch (e) {
          next(e)
        }
      })
    }
  }
}

Crsh.stylus = function () {
  try {
    var stylus = require('stylus')
  } catch (e) {
    throw new Error('stylus not installed')
  }

  return function () {
    this.addType('css', 'styl')

    return function (file, filename, next) {
      stylus(file)
        .set('filename', filename)
        .set('compress', isProd)
        .render(next)
    }
  }
}

Crsh.less = function (conf) {
  try {
    var less = require('less')
  } catch (e) {
    throw new Error('less not installed')
  }

  return function () {
    this.addType('css', 'less')

    if ( ! conf) {
      conf = { paths: [this.path] }
    }

    var parser = new (less.Parser)(conf)

    return function (file, next) {
      parser.parse(file, function (err, tree) {
        try {
          next(err, err ? null : tree.toCSS({
            compress: !!conf.compress
          }))
        } catch (e) {
          // Y U NO THROW REAL ERRORS, LESS??
          next(new Error(e.message))
        }
      })
    }
  }
}


/**
 * Supported output types and input types that map to them
 */
Crsh.prototype.types = { 'js': ['js'], 'css': ['css'] }

function noDot (t) {
  return t[0] === '.' ? t.substr(1) : t
}

/**
 * Add a type to supported types.
 * It's recommended that added filters
 * call this in the registration process.
 * 
 * @param string
 *    The output type it should represent
 * 
 * @param string
 *    File extension to match against
 */
Crsh.prototype.addType = function (type, ext) {
  type = noDot(type)
  ext = noDot(ext)
  if (typeof this.types[type] === 'undefined') {
    this.types[type] = []
  }
  if (this.types[type].indexOf(ext) < 0) {
    this.types[type].push(ext)
  }
}


/**
 * Add a file to the watcher
 * 
 * @param string
 *    Relative or absolute path to file
 */
Crsh.prototype.add = function (f) {
  f = helper.realPath(f, this.path)
  var format = this.getFormat(f)

  // Mixing formats is bad
  if (this.format && this.format !== format) {
    throw new Error('Can not mix formats!')
  }

  // Make sure format is set
  this.format || (this.format = format)

  // Add to list
  this.list.push(f)

  // Add to watcher
  this.watcher && this.watcher.add(f)

  return this
}

/**
 * Attempt to identify file type
 * 
 * @param string
 *    File name or path
 */
Crsh.prototype.getFormat = function (file) {
  var ext = noDot(path.extname(file))
  for (var i in this.types) {
    if (this.types[i].indexOf(ext) >= 0) {
      return i
    }
  }
  return false
}

// Aliases for getFormat
Crsh.prototype.isJs = function (f) { return 'js' === this.getFormat(f) }
Crsh.prototype.isCss = function (f) { return 'css' === this.getFormat(f) }


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
 * Applies input filters to file map
 */
Crsh.prototype.applyInputFilters = function (files, cb) {
  var self = this

  // Prepare filters for each file
  var filters = this.list.map(function (file) {
    var fn = self.findFilter(path.extname(file))
    return function (next) {
      // Convert buffers to strings
      files[file] = files[file].toString()

      // Create dynamic arg list
      var args = [files[file]]

      // Add filename, if callback accepts it
      ;(fn.length === 3) && args.push(file)

      // Add receiver function
      args.push(function (err, data) {
        err || (files[file] = data)
        next(err)
      })

      // Execute
      fn.apply(null, args)
    }
  })

  // Apply filters in parallel
  async.parallel(filters, function (err) {
    cb(err, files)
  })
}


/**
 * Merge and minify all the files
 */
Crsh.prototype.compile = function (cb) {
  var list = this.list, self = this
  cb || (cb = function () {})

  // Generate name only when a compile occurs
  this.name = 'crsh-' + helper.md5(this.list.join(',')) + '.' + this.format
  
  // Load all the files into a hash
  Files.load(list, function (err, files) {
    if (err) cb(err)

    // Run through matching input filters
    self.applyInputFilters(files, function (err, filteredFiles) {
      if (err) { return cb(err) }

      // Merge all the files
      var data = list.map(function (file) {
        return filteredFiles[file]
      }).join('')

      // Only uglify in production
      if (isProd && self.format === 'js') {
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


// Cheat some prototype accessors into statics
Crsh.addFilter = Crsh.prototype.addFilter.bind(Crsh.prototype)
Crsh.findFilter = Crsh.prototype.findFilter.bind(Crsh.prototype)
Crsh.addType = Crsh.prototype.addType.bind(Crsh.prototype)
Crsh.isJs = Crsh.prototype.isJs.bind(Crsh.prototype)
Crsh.isCss = Crsh.prototype.isCss.bind(Crsh.prototype)
Crsh.getFormat = Crsh.prototype.getFormat.bind(Crsh.prototype)


// For backwards compatibility,
// enable coffee and stylus by default.
Crsh.addFilter('coffee', Crsh.coffee())
Crsh.addFilter('styl', Crsh.stylus())


// Export the interface
module.exports = Crsh