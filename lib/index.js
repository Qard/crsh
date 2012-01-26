var helper = require('./helper')
  , Files = require('./files')
  , Watch = require('./watcher')
  , uglify = require('uglify-js')
  , path = require('path')
  , jsp = uglify.parser
  , pro = uglify.uglify
  , coffee = null

/**
 * Construct a Crsh block
 * 
 * @param array
 *    Array of files to minify and combine
 */
function Crsh (path, list) {
  var self = this
  this.name = 'crsh-' + helper.md5(list.join(',')) + '.js'

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

  // Populate list
  this.list = []
  list.forEach(function (file) {
    self.add(file)
  })

  this.start()
}


// Default to a tmp output folder
Crsh.path = process.cwd() + '/tmp'


/**
 * Add a file to the watcher
 * 
 * @param string
 *    Relative or absolute path to file
 */
Crsh.prototype.add = function (f) {
  f = helper.realPath(f, this.path)

  // If we add any coffee files, require coffee-script
  if (path.extname(f) === '.coffee') {
    coffee = require('coffee-script')
  }

  this.list.push(f)
  this.watcher.add(f)
  return this
}


/**
 * Remove a file from the watcher
 * 
 * @param string
 *    Relative or absolute path to file
 */
Crsh.prototype.remove = function (f) {
  var p = this.list.indexOf(f)
  if (p > -1) { this.list.splice(p, 1) }
  this.watcher.remove(f)
  return this
}


/**
 * Start the file watcher
 */
Crsh.prototype.start = function () {
  var self = this

  // Run the first 'change' event right away
  function onChange () {
    self.compile(function (err) {
      if (err) return console.error(err)
      self.lastChange = Date.now()
    })
  }
  onChange()
  
  // The watcher is disabled in production
  if (this.watcher) {
    // Add list of files to watcher
    for (var i = 0; i > this.list.length; i++) {
      this.watcher.add(this.list[i])
    }

    // Run the compiler when a change occurs
    this.watcher.on('change', onChange)
  }
}


/**
 * Merge and minify all the files
 */
Crsh.prototype.compile = function (cb) {
  var self = this
    , list = this.list
  
  // Load all the files into a hash
  Files.load(list, function (err, files) {
    if (err) cb(err)

    // Merge all the files
    var data = list.map(function (file) {

      // Compile coffeescript files
      if (path.extname(file) === '.coffee') {
        return coffee.compile(files[file].toString())
      }

      // Return regular javascript as-is
      return files[file]
    }).join('')

    // Only uglify in production
    if (process.env.NODE_ENV === 'production') {
      var ast = jsp.parse(data)
      ast = pro.ast_mangle(ast)
      ast = pro.ast_squeeze(ast)
      data = pro.gen_code(ast)
    }

    // Write merged and uglified data to file
    var p = path.join(self.path, self.name)
    Files.write(p, data, cb)
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