var gdal = require('gdal');

module.exports = function(infile, outfile) {
  var sm = gdal.SpatialReference.fromEPSG(3857);
  var wgs84 = gdal.SpatialReference.fromEPSG(4326);
  var world = gdal.Geometry.fromWKT(
    'POLYGON((-180 -85.0513, 180 -85.0513, 180 85.0513, -180 85.0513, -180 -85.0513))',
    wgs84
  );
  var inDs = gdal.open(infile);
  var outDs = gdal.open(outfile, 'w', 'ESRI Shapefile');
  var inLayer = inDs.layers.get(0);
  var outLayer = outDs.layers.create(inLayer.name, sm, inLayer.geomType);
  var toSm = new gdal.CoordinateTransformation(inLayer.srs, sm);
  var toNative = new gdal.CoordinateTransformation(wgs84, inLayer.srs);

  try { world.transform(toNative); }
  catch (err) { } // noop, will leave world === null and we won't crop anything

  inLayer.fields.forEach(function(field) {
    outLayer.fields.add(field);
  });

  inLayer.features.forEach(function(feature) {
    var projected = feature.clone();
    var geom = projected.getGeometry();

    // Originally null geometries are ok to pass through
    if (!geom) return outLayer.features.add(projected);

    // If we can crop features, do it
    if (world) geom = geom.intersection(world);

    // If geom is null at this point, that means it got cropped out
    if (!geom) return;

    // Otherwise, transform the feature, pass it through to the output
    geom.transform(toSm);
    projected.setGeometry(geom);
    outLayer.features.add(projected);
  });

  outLayer.flush();
};
