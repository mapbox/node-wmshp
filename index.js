var gdal = require('gdal');

module.exports = function (infile, outfile) {
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

	inLayer.fields.forEach(function (field) {
		outLayer.fields.add(field);
	});

	inLayer.features.forEach(function (feature) {

		var geom = feature.getGeometry();
		if (geom) {
			var geomType = geom.wkbType;
			//do we support 2.5D in other tools of the chain, too?
			//then we should support it here, too.
			if (
				geomType === gdal.wkbMultiPoint
				|| geomType === gdal.wkbMultiPolygon
				|| geomType === gdal.wkbMultiLineString
			) {
				//iterate through all parts of the multipart feature
				geom.children.forEach(function (singleGeom) {
					project(outLayer, feature, singleGeom, toSm, world);
				});
			} else {
				project(outLayer, feature, geom, toSm, world);
			}
		} else {
			// Originally null geometries are ok to pass through
			outLayer.features.add(feature.clone());
		}
	});

	outLayer.flush();
};

function project(outLayer, feature, geom, toSm, world) {

	var projected = feature.clone();
	geom = geom.clone();

	// If we can crop features, do it
	if (world) geom = geom.intersection(world);

	// If geom is null or empty at this point, that means it got cropped out
	if (!geom || geom.isEmpty()) return;

	// Otherwise, transform the feature, pass it through to the output
	// still can fail here, if not cropping and transformation would be 
	// out of bounds of target projection
	try { geom.transform(toSm); }
	catch (err) { return; }

	projected.setGeometry(geom);
	outLayer.features.add(projected);
}