var gdal = require('gdal');

module.exports = function(infile, outfile, callback) {
  var sm = gdal.SpatialReference.fromEPSG(3857);
  var world = gdal.Geometry.fromWKT(
    'POLYGON((-180 -85.05133, 180 -85.05133, 180 85.05133, -180 85.05133, -180 -85.05133))',
    gdal.SpatialReference.fromEPSG(4326)
  );
  var inDs;
  var outDs;

  try {
    inDs = gdal.open(infile);
    outDs = gdal.open(outfile, 'w', 'ESRI Shapefile');
  }
  catch (err) { return callback(err); }

  var inLayer;
  var outLayer;

  try {
    inLayer = inDs.layers.get(0);
    outLayer = outDs.layers.create(inLayer.name, sm, inLayer.geomType);
  }
  catch (err) { return callback(err); }

  try {
    inLayer.fields.forEach(function(field) {
      outLayer.fields.add(field);
    });
  }
  catch (err) { return callback(err); }

  inLayer.features.forEach(function(feature) {
    var projected = feature.clone();
    var geom = projected.getGeometry();

    // Allow null geoms
    if (!geom) {
      outLayer.features.add(projected);
      return;
    }

    geom = geom.intersection(world);
    geom.transformTo(sm);
    projected.setGeometry(geom);
    outLayer.features.add(projected);
  });

  outLayer.flush();

  callback();
};
