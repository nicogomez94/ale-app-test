const pdfParse = require('pdf-parse');
const fs = require('fs');
pdfParse(fs.readFileSync(process.argv[2])).then(d => {
  process.stdout.write(d.text);
}).catch(e => console.error(e.message));
