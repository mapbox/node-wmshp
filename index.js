var gdal = require('gdal');

module.exports = function(infile, outfile, callback) {
  var sm = gdal.SpatialReference.fromEPSG(3857),
      inDs, outDs, inLayer, outLayer;

  try {
    inDs = gdal.open(infile);
    outDs = gdal.open(outfile, 'w', 'ESRI Shapefile');
  }
  catch (err) { return callback(err); }

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
    try {
      var projected = feature.clone(),
        geom = projected.getGeometry();
    } catch (err) {
      // for now, catch null geometries, dont reproject them, add, and continue with next feature
      outLayer.features.add(projected);
      return;
    }

    geom.transformTo(sm);
    projected.setGeometry(geom);
    outLayer.features.add(projected);
  });

  outLayer.flush();

  callback();
};
