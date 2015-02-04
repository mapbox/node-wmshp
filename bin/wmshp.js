#!/usr/bin/env node

var wmshp = require('..'),
    path = require('path'),
    args = process.argv.slice(2),
    infile = path.resolve(args[0]),
    outfile = path.resolve(args[1]);

if (!infile || !outfile) {
  console.error('Usage: wmshp <infile> <outfile>');
  process.exit(1);
}

wmshp(infile, outfile, function(err) {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  process.exit(0);
});
