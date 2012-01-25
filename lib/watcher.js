var events = require('events')
  , Files = require('./files')
  , helper = require('./helper')
  , util = require('util')
  , fs = require('fs')

/**
 * Construct watcher
 */
function Watch () {
  events.EventEmitter.call(this)
}
util.inherits(Watch, events.EventEmitter)

/**
 * Add file to watcher
 */
Watch.prototype.add = function (file) {
  var self = this
  file = helper.realPath(file)
  Files.fileExists(file, function (exists) {
    if (exists) {
      fs.watchFile(file, function (prev, curr) {
        try {
          if (prev.mtime.getTime() !== curr.mtime.getTime()) {
            self.emit('change', file, prev, curr)
          }
        } catch (e) {}
      })
    }
  })
}

/**
 * Remove file from watcher
 */
Watch.prototype.remove = function (file) {
  file = helper.realPath(file)
  fs.unwatchFile(file)
}

module.exports = Watch