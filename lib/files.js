var async = require('async')
  , path = require('path')
  , fs = require('fs')

function Files () {}

/**
 * Load group of files into named hash
 * 
 * @param array
 *    Sorted list of file paths
 * 
 * @param function
 *    Function to receive final hash
 */
Files.prototype.load = function (files, fn) {
  var results = {}

  // Receive a file loaded in the waterfall
  function receiver (file, cb) {
    return function (err, data) {
      if (err) { return cb(err) }
      results[file] = data
      cb()
    }
  }

  // In any order, load file contents into results
  async.parallel(files.map(function (file) {
    return function (cb) {
      fs.readFile(file, receiver(file, cb))
    }
  
  // Return our parallel constructed result list instead
  }), function (err, res) {
    fn(err, results)
  })
}

/**
 * Safely write data to a file
 * 
 * @param string
 *    Path to file
 * 
 * @param string
 *    Text content
 * 
 * @param function
 *    Callback to continue to when complete
 */
Files.prototype.write = function (file, data, fn) {
  fn || (fn = function () {})

  // Ensure existence of path
  var p = path.dirname(file)
  this.ensurePath(p, function (err) {
    if (err) { return fn(err) }

    // Write to the file
    fs.writeFile(file, data, fn)
  })
}

/**
 * Check if a file exists
 * 
 * @param string
 *    File to verify existence of
 * 
 * @param function
 *    Callback, receives boolean verifier
 */
Files.prototype.fileExists = function (path, cb) {
  fs.stat(path, function (err, stat) {
    cb( ! err && stat.isFile())
  })
}

/**
 * Check if a path exists
 * 
 * @param string
 *    Path to verify existence of
 * 
 * @param function
 *    Callback, receives boolean verifier
 */
Files.prototype.pathExists = function (path, cb) {
  fs.stat(path, function (err, stat) {
    cb( ! err && stat.isDirectory())
  })
}

/**
 * Ensure existence of a path before continuing
 * 
 * @param string
 *    Path to ensure existence of
 * 
 * @param function
 *    Callback to continue to
 */
Files.prototype.ensurePath = function (path, cb) {
  this.pathExists(path, function (exists) {
    if (exists) { return cb() }
    fs.mkdir(path, cb)
  })
}

module.exports = new Files