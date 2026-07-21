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
var stateplane = path.join(__dirname, 'fixtures', 'stateplane', 'stateplane.shp');
var states = path.join(__dirname, 'fixtures', 'states', 'states.shp');
var antarctica = path.join(__dirname, 'fixtures', 'antarctica', 'antarctica.shp');
var polar = path.join(__dirname, 'fixtures', 'polar', 'polar.shp');
var expectedwgs84 = path.join(__dirname, 'expected', 'wgs84', 'wgs84.shp');
var expectednullgeom = path.join(__dirname, 'expected', 'nullgeom', 'null_geom.shp');
var expectedpoles = path.join(__dirname, 'expected', 'poles', 'poles.shp');
var expectedstateplane = path.join(__dirname, 'expected', 'stateplane', 'stateplane.shp');
var expectedstates = path.join(__dirname, 'expected', 'states', 'states.shp');
var expectedantarctica = path.join(__dirname, 'expected', 'antarctica', 'antarctica.shp');

function truncate(num) {
  return Math.floor(num * Math.pow(10, 6)) / Math.pow(10, 6);
}

function truncatedExtent(extent) {
  return [
    truncate(extent.minX),
    truncate(extent.minY),
    truncate(extent.maxX),
    truncate(extent.maxY)
  ];
}

function compare(actual, expected, assert) {
  actual = gdal.open(actual);
  expected = gdal.open(expected);

  assert.equal(actual.layers.count(), expected.layers.count(), 'matches ogr2ogr layer count');

  actual = actual.layers.get(0);
  expected = expected.layers.get(0);
  assert.deepEqual(truncatedExtent(actual.getExtent()), truncatedExtent(expected.getExtent()), 'matches ogr2ogr extent');
  assert.equal(actual.features.count(), expected.features.count(), 'matches ogr2ogr feature count');
}

test('reprojects', function(assert) {
  var outfile = path.join(os.tmpdir(), crypto.randomBytes(8).toString('hex') + '.shp');
  wmshp(wgs84, outfile);

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

  compare(outfile, expectedwgs84, assert);

  assert.end();
});

test('reproject into a folder', function(assert) {
  var outfolder = path.join(os.tmpdir(), crypto.randomBytes(8).toString('hex'));
  wmshp(wgs84, outfolder);

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

test('reproject from a folder', function(assert) {
  var outfolder = path.join(os.tmpdir(), crypto.randomBytes(8).toString('hex'));
  var infolder = path.dirname(wgs84);

  wmshp(infolder, outfolder);

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

test('Allow null geometry', function(assert) {
  var outfile = path.join(os.tmpdir(), crypto.randomBytes(8).toString('hex') + '.shp');
  wmshp(nullgeom, outfile);

  var ds = gdal.open(outfile);

  ds.layers.forEach(function(layer) {
    assert.equal(layer.features.count(), 1, 'reprojected all features');
    var feature = layer.features.get(0);
    var geojson = feature.getGeometry();

    assert.deepEqual(geojson, null, 'checked feature has proper coordinates');
  });

  compare(outfile, expectednullgeom, assert);

  assert.end();
});

test('reproject features that go to 90/-90', function(assert) {
  var outfolder = path.join(os.tmpdir(), crypto.randomBytes(8).toString('hex'));
  wmshp(poles, outfolder);

  fs.readdir(outfolder, function(err, files) {
    if (err) throw err;

    assert.equal(files.length, 4, 'gdal creates four files');
    var extensions = files.map(function(filename) {
      return path.extname(filename);
    });

    ['.dbf', '.prj', '.shp', '.shx'].forEach(function(extension) {
      assert.ok(extensions.indexOf(extension) > -1, extension + ' file created');
    });

    compare(outfolder, expectedpoles, assert);

    assert.end();
  });
});

test('reprojects shapefiles in stateplane coordinate system', function(assert) {
  var outfolder = path.join(os.tmpdir(), crypto.randomBytes(8).toString('hex'));
  wmshp(stateplane, outfolder);

  fs.readdir(outfolder, function(err, files) {
    if (err) throw err;

    assert.equal(files.length, 4, 'gdal creates four files');
    var extensions = files.map(function(filename) {
      return path.extname(filename);
    });

    ['.dbf', '.prj', '.shp', '.shx'].forEach(function(extension) {
      assert.ok(extensions.indexOf(extension) > -1, extension + ' file created');
    });

    compare(outfolder, expectedstateplane, assert);

    assert.end();
  });
});

test('reprojects shapefiles in lambert coordinate system', function(assert) {
  var outfolder = path.join(os.tmpdir(), crypto.randomBytes(8).toString('hex'));
  wmshp(states, outfolder);

  fs.readdir(outfolder, function(err, files) {
    if (err) throw err;

    assert.equal(files.length, 4, 'gdal creates four files');
    var extensions = files.map(function(filename) {
      return path.extname(filename);
    });

    ['.dbf', '.prj', '.shp', '.shx'].forEach(function(extension) {
      assert.ok(extensions.indexOf(extension) > -1, extension + ' file created');
    });

    compare(outfolder, expectedstates, assert);

    assert.end();
  });
});

test('reprojects antarctica, cropped, from wgs84', function(assert) {
  var outfolder = path.join(os.tmpdir(), crypto.randomBytes(8).toString('hex'));
  wmshp(antarctica, outfolder);

  fs.readdir(outfolder, function(err, files) {
    if (err) throw err;

    assert.equal(files.length, 4, 'gdal creates four files');
    var extensions = files.map(function(filename) {
      return path.extname(filename);
    });

    ['.dbf', '.prj', '.shp', '.shx'].forEach(function(extension) {
      assert.ok(extensions.indexOf(extension) > -1, extension + ' file created');
    });

    compare(outfolder, expectedantarctica, assert);

    assert.end();
  });
});

test('reprojects antarctica, cropped, from polar stereoscopic', function(assert) {
  var outfolder = path.join(os.tmpdir(), crypto.randomBytes(8).toString('hex'));
  wmshp(polar, outfolder);

  fs.readdir(outfolder, function(err, files) {
    if (err) throw err;

    assert.equal(files.length, 4, 'gdal creates four files');
    var extensions = files.map(function(filename) {
      return path.extname(filename);
    });

    ['.dbf', '.prj', '.shp', '.shx'].forEach(function(extension) {
      assert.ok(extensions.indexOf(extension) > -1, extension + ' file created');
    });

    compare(outfolder, expectedantarctica, assert);

    assert.end();
  });
});
