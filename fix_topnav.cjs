const fs = require('fs');
const p = 'C:/Proyectos/RED SOCIAL HSOCIAL/src/components/navigation/TopNavigation.tsx';
let c = fs.readFileSync(p, 'utf8');

const findAndReplace = (old, neu) => {
  const crlf = old.replace(/\n/g, '\r\n');
  if (c.includes(crlf)) { c = c.replace(crlf, neu.replace(/\n/g, '\r\n')); return true; }
  if (c.includes(old)) { c = c.replace(old, neu); return true; }
  return false;
};

const ok1 = findAndReplace(
  '        isOpen={showFullScreenSearch} \n        onClose={() => setShowFullScreenSearch(false)} ',
  '        isOpen={state.showFullScreenSearch}\n        onClose={() => dispatch({ type: \'TOGGLE_FULLSCREEN_SEARCH\' })}'
);
process.stdout.write('fix1 (FullScreenSearch desktop): ' + ok1 + '\n');

const ok2 = findAndReplace(
  '        isVisible={showPostModal}\n        onClose={() => setShowPostModal(false)}',
  '        isVisible={state.showPostModal}\n        onClose={() => dispatch({ type: \'TOGGLE_POST_MODAL\' })}'
);
process.stdout.write('fix2 (ModalPublicacionWeb desktop): ' + ok2 + '\n');

fs.writeFileSync(p, c, 'utf8');
process.stdout.write('saved\n');
