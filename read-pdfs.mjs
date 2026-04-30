import { readFileSync } from 'fs';

function pdfToText(path) {
  const buf = readFileSync(path);
  const str = buf.toString('latin1');
  const texts = [];
  const re1 = /\(([^)]{1,300})\)\s*Tj/g;
  const re2 = /\[((?:[^\[\]]*|\[[^\]]*\])*)\]\s*TJ/g;
  let m;
  while ((m = re1.exec(str)) !== null) {
    const t = m[1]
      .replace(/\\[0-9]{3}/g, s => String.fromCharCode(parseInt(s.slice(1), 8)))
      .replace(/\\\\/g, '\\').replace(/\\n/g, '\n').replace(/\\r/g, '')
      .replace(/\\\(/g, '(').replace(/\\\)/g, ')');
    if (t.trim()) texts.push(t);
  }
  while ((m = re2.exec(str)) !== null) {
    const parts = [...m[1].matchAll(/\(([^)]{0,200})\)/g)].map(x => x[1]);
    const t = parts.join('').replace(/\\[0-9]{3}/g, s => String.fromCharCode(parseInt(s.slice(1), 8)));
    if (t.trim()) texts.push(t);
  }
  return texts.join(' ').replace(/\s{2,}/g, ' ').trim();
}

console.log('=== MODULOSXTRA ===');
console.log(pdfToText('PAS_Alert_MODULOSXTRA.docx.pdf').substring(0, 10000));
console.log('\n\n=== PRD4 ===');
console.log(pdfToText('PAS_Alert_PRD4.pdf').substring(0, 10000));
