var gdal = require('gdal');
var wkt = require('./bounds');

module.exports = function(infile, outfile) {
  var sm = gdal.SpatialReference.fromEPSG(3857);
  var wgs84 = gdal.SpatialReference.fromEPSG(4326);
  var world = gdal.Geometry.fromWKT(wkt, wgs84);
  var inDs = gdal.open(infile);
  var outDs = gdal.open(outfile, 'w', 'ESRI Shapefile');
  var inLayer = inDs.layers.get(0);
  var outLayer = outDs.layers.create(inLayer.name, sm, inLayer.geomType);
  var toSm = new gdal.CoordinateTransformation(inLayer.srs, sm);
  var toNative = new gdal.CoordinateTransformation(wgs84, inLayer.srs);

  try {
    world.transform(toNative);
    if (!world.isValid()) world = world.simplify(0);
    if (!world.isValid()) throw new Error();
  } catch (err) {
    world = null;
  }

  inLayer.features.forEach(function(feature) {
    var projected = feature.clone();
    var geom = projected.getGeometry();

    // Originally null geometries are ok to pass through
    if (!geom || geom.isEmpty()) return outLayer.features.add(projected);

    // Extremely gentle simplify won't move vertices but will remove duplicate ones
    if (!geom.isValid()) geom = geom.simplify(0);

    // If we can crop features, do it
    if (world && !world.isEmpty()) geom = geom.intersection(world);

    // If geom is null at this point, that means it got cropped out
    if (!geom || geom.isEmpty()) return;

    // Otherwise, transform the feature, pass it through to the output
    geom.transform(toSm);
    projected.setGeometry(geom);
    outLayer.features.add(projected);
  });

  outLayer.flush();
};
