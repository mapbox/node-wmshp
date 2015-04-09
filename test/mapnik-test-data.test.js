var test = require('tape');
var wmshp = require('..');
var path = require('path');
var os = require('os');
var fs = require('fs');
var crypto = require('crypto');
var dataDir = path.resolve(path.dirname(require.resolve('mapnik-test-data')), 'data', 'shp');
var fixtures = fs.readdirSync(dataDir).map(function(foldername) {
  var shpfileName = fs.readdirSync(path.join(dataDir, foldername)).filter(function(filename) {
    return path.extname(filename) === '.shp';
  })[0];
  return path.join(dataDir, foldername, shpfileName);
});

fixtures.forEach(function(infile) {
  test('[mapnik-test-data] ' + path.basename(infile), function(assert) {
    var outfolder = path.join(os.tmpdir(), crypto.randomBytes(8).toString('hex'));
    wmshp(infile, outfolder);

    fs.readdir(outfolder, function(err, files) {
      if (err) throw err;

      assert.equal(files.length, 4, 'creates four files');
      var extensions = files.map(function(filename) {
        return path.extname(filename);
      });

      ['.dbf', '.prj', '.shp', '.shx'].forEach(function(extension) {
        assert.ok(extensions.indexOf(extension) > -1, extension + ' file created');
      });

      assert.end();
    });
  });
});
