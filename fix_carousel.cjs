const fs = require('fs');
const p = 'C:/Proyectos/RED SOCIAL HSOCIAL/src/components/post/MediaCarousel.tsx';
let c = fs.readFileSync(p, 'utf8');
const marker = '  // Carrusel estilo Instagram';
const idx = c.indexOf(marker);
process.stdout.write('idx: ' + idx + '\n');
if (idx >= 0) {
  const insertion = '  if (!mediaItems || mediaItems.length === 0) return null;\r\n\r\n';
  c = c.slice(0, idx) + insertion + c.slice(idx);
  fs.writeFileSync(p, c, 'utf8');
  process.stdout.write('done\n');
  process.stdout.write('has early return: ' + c.includes('if (!mediaItems') + '\n');
} else {
  process.stdout.write('marker not found\n');
}
