const fs = require('fs');

function findNested(filePath, name) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const hits = [];
  lines.forEach((l, i) => {
    if (l.match(new RegExp('const\\s+' + name + '\\s*='))) {
      hits.push({ line: i + 1, indent: l.match(/^(\s*)/)[1].length, text: l.trim().substring(0, 80) });
    }
  });
  return hits;
}

['ConversationItem', 'ValidationSummary', 'TrackCard'].forEach(name => {
  const files = [
    'src/components/chat/PrivateMessages.tsx',
    'src/components/ModalPublicacionWeb.tsx',
    'src/components/media/MusicSelector.tsx',
  ];
  files.forEach(f => {
    const hits = findNested(f, name);
    if (hits.length > 0) {
      process.stdout.write(f.split('/').pop() + ' -> ' + name + ':\n');
      hits.forEach(h => process.stdout.write('  line ' + h.line + ' indent=' + h.indent + ': ' + h.text + '\n'));
    }
  });
});
