# CRSH your javascript into tiny blocks.
With crsh, you can combine a whole bunch of javascript (or coffeescript!) files into one tiny block. Or several if you like. All files are compiled and merged automagically after each change, but not when in production mode. Inversely; the resulting code is uglified, but only when IN production. Line numbers are handy in development.

## Requirements
* Node.js 0.4+

## Install

    npm install jsonfig

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

## API

#### new Crsh([base_path], [file_paths])
Constructs a new block, compiles and starts the watcher, if watcher is allowed in the current mode. Accepts a base_path and a list of file paths to add to the block, either can be left out. If base_path is empty Crsh.path will be used, which defaults to process.cwd(). If file_paths is empty, crsh.compile() will not be executed right away; you must first add() file paths, then compile().

#### crsh.add|remove(path)
Add or remove a file by its path from the block and watcher. Note that this will not recompile the block. In this particular case crsh.compile() should be called manually.

#### crsh.compile(callback)
Forces the current block to compile. This is called automatically when a new block is constructed with a file_paths list or the watcher is enable and a change has occured. When chaining, this is called manually instead.

#### Crsh.middleware([base_path], block_defs)
For each item in block_defs, constructs a new Crsh instance and exposes it in req.crsh[name]. Also creates a "crsh_{name}" properties in view locals.

---

### Copyright (c) 2011 Stephen Belanger
#### Licensed under MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.