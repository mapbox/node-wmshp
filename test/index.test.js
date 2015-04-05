var test = require('tape');
var wmshp = require('..');
var gdal = require('gdal');
var path = require('path');
var os = require('os');
var fs = require('fs');
var crypto = require('crypto');
var wgs84 = path.join(__dirname, 'fixtures', 'wgs84', 'wgs84.shp');
var nullgeom = path.join(__dirname, 'fixtures', 'nullgeom', 'null_geom.shp');
var poles = path.join(__dirname, 'fixtures', 'poles', 'poles.shp');

function truncate(num) {
  return Math.floor(num * Math.pow(10, 6)) / Math.pow(10, 6);
}

test('reprojects', function(assert) {
  var outfile = path.join(os.tmpdir(), crypto.randomBytes(8).toString('hex') + '.shp');
  wmshp(wgs84, outfile, function(err) {
    assert.ifError(err, 'no error');
    var ds = gdal.open(outfile);
    var sm = gdal.SpatialReference.fromEPSG(3857);
    var i = 0;
    var expectedGeom = {
      type: 'MultiPolygon',
      coordinates: [
        [
          [
            [-6866928.470493725501001, 1936250.700885409722105],
            [-6889254.039650277234614, 1945721.30792881315574],
            [-6878926.596530904062092, 1952525.806653905194253],
            [-6866928.470493725501001, 1936250.700885409722105]
          ]
        ],
        [
          [
            [-6871659.994130388833582, 2004785.506589464843273],
            [-6885450.920566814951599, 2001782.969531796174124],
            [-6887677.755660644732416, 2015984.397128761047497],
            [-6871659.994130388833582, 2004785.506589464843273]
          ]
        ]
      ]
    };

    expectedGeom.coordinates = expectedGeom.coordinates.map(function(polygon) {
      return polygon.map(function(ring) {
        return ring.map(function(point) {
          return point.map(truncate);
        });
      });
    });

    ds.layers.forEach(function(layer) {
      if (i > 0) assert.fail('should have only one layer');
      i++;

      assert.ok(layer.srs.isSame(sm), 'reprojected');
      assert.equal(layer.features.count(), 245, 'reprojected all features');

      var feature = layer.features.get(0);
      var geojson = JSON.parse(feature.getGeometry().toJSON());

      geojson.coordinates = geojson.coordinates.map(function(polygon) {
        return polygon.map(function(ring) {
          return ring.map(function(point) {
            return point.map(truncate);
          });
        });
      });

      assert.deepEqual(geojson, expectedGeom, 'checked feature has proper coordinates');
    });

    assert.end();
  });
});

test('Allow null geometry', function(assert) {
  var outfile = path.join(os.tmpdir(), crypto.randomBytes(8).toString('hex') + '.shp');
  wmshp(nullgeom, outfile, function(err) {
    assert.ifError(err, 'no error');
    var ds = gdal.open(outfile);

    ds.layers.forEach(function(layer) {
      assert.equal(layer.features.count(), 1, 'reprojected all features');
      var feature = layer.features.get(0);
      var geojson = feature.getGeometry();

      assert.deepEqual(geojson, null, 'checked feature has proper coordinates');
    });

    assert.end();
  });
});

test('reproject into a folder', function(assert) {
  var outfolder = path.join(os.tmpdir(), crypto.randomBytes(8).toString('hex'));
  wmshp(wgs84, outfolder, function(err) {
    assert.ifError(err, 'no error');

    fs.readdir(outfolder, function(err, files) {
      if (err) throw err;

      assert.equal(files.length, 4, 'gdal creates four files');
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

test('reproject from a folder', function(assert) {
  var outfolder = path.join(os.tmpdir(), crypto.randomBytes(8).toString('hex'));
  var infolder = path.dirname(wgs84);

  wmshp(infolder, outfolder, function(err) {
    assert.ifError(err, 'no error');

    fs.readdir(outfolder, function(err, files) {
      if (err) throw err;

      assert.equal(files.length, 4, 'gdal creates four files');
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

test('reproject features that go to 90/-90', function(assert) {
  var outfolder = path.join(os.tmpdir(), crypto.randomBytes(8).toString('hex'));
  wmshp(poles, outfolder, function(err) {
    assert.ifError(err, 'no error');

    fs.readdir(outfolder, function(err, files) {
      if (err) throw err;

      assert.equal(files.length, 4, 'gdal creates four files');
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
