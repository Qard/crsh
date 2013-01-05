[![build status](https://secure.travis-ci.org/Qard/crsh.png)](http://travis-ci.org/Qard/crsh)
# CRSH your javascript and css into tiny blocks.
With crsh, you can combine a whole bunch of javascript and coffeescript or css and stylus files into one tiny block. Or several if you like. All files are compiled and merged automagically after each change, but the watcher is disabled in production. In production, resulting javascript will also be uglified.

## Requirements
* Node.js 0.4+

## Install

    npm install crsh

## Usage
### Middleware Mode
    
    // The middleware will setup the file watcher
    // and rebuild the block whenever a file changes
    app.use(Crsh.middleware(__dirname + '/public/javascripts', {
      libs: [
        './jquery.js'
        , './underscore.js'
        , './backbone.js'
      ]
    }));

    // Now that the middleware is attached, req.crsh becomes available
    app.use(function (req, res) {
      // Here's our block object
      var block = req.crsh.libs;

      // We can get the file of the block like this;
      var name = block.name;

      // Should look something like "crsh-{md5-of-joined-filenames}.js"
      console.log(name);

      // We can also get it with a cachebusting string like this;
      var url = block.getUrl();

      // Same as before but with "?{modification-date}" after it
      console.log(url);
      
      // A "local" property is also created for use in views
      // This is equivalent to block.getUrl()
      var local = res.local('crsh_libs')
    });

### Manual Mode

    var crsh_libs = new Crsh(__dirname + '/public/javascripts', [
      './jquery.js'
      , './underscore.js'
      , './backbone.js'
    ])

    var url = crsh_libs.getUrl()

or

    var crsh_libs = new Crsh(__dirname + '/public/javascripts')

    crsh_libs
      .add('./jquery.js')
      .add('./underscore.js')
      .add('./backbone.js')
      .compile()
    
    var url = crsh_libs.getUrl()

### NEW! Filters
    
    // Let's try a csv-to-json filter
    Crsh.addFilter('csv', function () {
      var csv = require('csv')
      this.addType('json', 'csv')

      return function (data, next) {
        var pattern = /(?:^|,)("(?:[^"]+)*"|[^,]*)/g
          , lines = data.split("\n")
          , keys = lines.shift()
            .split(pattern)
            .map(function (key) {
              return key.toLowerCase()
            })
          , rows = lines.map(function (line) {
            var res = {}
            line.split(pattern).forEach(function (val, i) {
              if (keys[i]) {
                res[keys[i]] = val.replace(/"/g, '')
              }
            })
            return res
          })

        callback(null, JSON.stringify(rows))
      }
    })

## API

### new Crsh([basePath], [filePaths])
Constructs a new block, compiles and starts the watcher, if watcher is allowed in the current mode. Accepts a basePath and a list of file paths to add to the block, either can be left out. If base_path is empty Crsh.path will be used, which defaults to process.cwd(). If filePaths is empty, crsh.compile() will not be executed right away; you must first add() file paths, then compile().

### crsh.add|remove(path)
Add or remove a file by its path from the block and watcher. Note that this will not recompile the block. In this particular case crsh.compile() should be called manually.

### crsh.addType(outputType, ext)
Tells crsh to allow files of the specified extension and that they represent files of outputType. For example; crsh.addType('js', 'coffee') would tell it that Coffeescript files are allowed and should understood as Javascript. You'll still need to supply a filter to actually convert the Coffeescript though.

### crsh.addFilter(ext, filter)
Add a filter function to manipulate each file of the given file extension. Filters can be in two formats; a function which receives (data, next) or a closure which returns a (data, next) receiver. The closure type is handy for applying some modifications to Crsh beforehand. For example; using addType() to allow the file type we are filtering.

### crsh.findFilter(ext)
Retrieve the currently assigned filter for the supplied extension. This is meant to be used internally during the compile phase.

### crsh.coffee|stylus|less()
Crsh comes with some pre-made filters. For backwards compatibility, coffee and stylus filters are added automatically. These filters will need to be added explicitly in the next version though, be warned. Use them like this; crsh.addFilter('less', crsh.less())

### crsh.compile(callback)
Forces the current block to compile. This is called automatically when a new block is constructed with a file_paths list or the watcher is enable and a change has occured. When chaining, this is called manually instead.

### crsh.getUrl()
Gets a handy url fragment containing the name of the block file and a modification date timestamp for cachebusting.

### Crsh.middleware([base_path], blockDefs)
For each item in blockDefs, constructs a new Crsh instance and exposes it in req.crsh[name]. Also creates a "crsh_{name}" properties in view locals.

### Crsh.getFormat(filename_or_path)
Determines file extension and returns the outputType, if known, or false.

### Crsh.isJs|isCss(filename_or_path)
Convenient aliases to Crsh.getFormat to determine if the format is what you expect.

---

### Copyright (c) 2012 Stephen Belanger
#### Licensed under MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.