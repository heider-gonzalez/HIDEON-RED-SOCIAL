const fs = require('fs');
const p = 'src/components/post/actions/ActionsButtons.tsx';
let c = fs.readFileSync(p, 'utf8');

const old = 'onPointerLeave={() => setActiveReaction(null)}\r\n              />';
const newStr = 'onPointerLeave={() => setActiveReaction(null)}\r\n                userReaction={userReaction}\r\n              />';

if (!c.includes(old)) { process.stdout.write('not found\n'); process.exit(1); }
c = c.replace(old, newStr);
fs.writeFileSync(p, c, 'utf8');
process.stdout.write('done\n');
