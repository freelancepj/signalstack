#!/usr/bin/env node
const fs = require('node:fs');
const { analyze } = require('./engine');
const file = process.argv[2];
if (!file || process.argv.includes('--help')) {
  console.log('Usage: node src/cli.js examples/synthetic-event-stream.json');
  process.exit(file ? 0 : 1);
}
try {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log(JSON.stringify(analyze(data), null, 2));
} catch (error) {
  console.error(`Could not analyze stream: ${error.message}`);
  process.exitCode = 1;
}
