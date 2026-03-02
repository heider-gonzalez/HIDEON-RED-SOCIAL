const fs = require('fs');
const filePath = 'C:\\Proyectos\\RED SOCIAL HSOCIAL\\src\\components\\ModalPublicacionWeb.tsx';

let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

const START = '\n  // Validation summary component\n  const ValidationSummary = () => {';
const END_SUFFIX = '\n  };';
const END_CTX = '\n  };\n\n  // Autosave hook';

const si = content.indexOf(START);
if (si === -1) throw new Error('ValidationSummary start not found');
const ei = content.indexOf(END_CTX, si);
if (ei === -1) throw new Error('ValidationSummary end not found');

const sectionEnd = ei + END_SUFFIX.length;
const section = content.slice(si, sectionEnd);

const bodyStartOff = section.indexOf('() => {\n') + '() => {\n'.length;
const bodyEndOff = section.lastIndexOf('\n  };');
const bodyRaw = section.slice(bodyStartOff, bodyEndOff);

const bodyModuleScope = bodyRaw.split('\n').map(line => {
  if (line.startsWith('  ')) return line.slice(2);
  return line;
}).join('\n');

const newComp = `
const ValidationSummary = ({ validation }: { validation: ValidationResult }) => {
${bodyModuleScope}
};
`;

content = content.slice(0, si) + content.slice(sectionEnd);

const INSERT_BEFORE = '\nconst ModalPublicacionWeb: React.FC<ModalPublicacionWebProps> = ({';
const ii = content.indexOf(INSERT_BEFORE);
if (ii === -1) throw new Error('ModalPublicacionWeb insertion point not found');

content = content.slice(0, ii) + newComp + content.slice(ii);

content = content.replace('<ValidationSummary />', '<ValidationSummary validation={validation} />');

fs.writeFileSync(filePath, content.replace(/\n/g, '\r\n'), 'utf8');
console.log('fix2.cjs done!');
