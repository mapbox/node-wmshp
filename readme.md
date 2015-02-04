# node-wmshp

Reproject shapefiles into EPSG:3857 using [node-gdal](https://github.com/naturalatlas/node-gdal).

## Usage

As a shell script:

```
wmshp <infile> <outfile>
```

In Node.js

```js
var wmshp = require('wmshp');
wmshp('/path/to/input.shp', '/path/to/output.shp', function(err) {
  if (err) console.error(err);
  else console.log('done!');
});
```
