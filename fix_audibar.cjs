const fs = require('fs');
const p = 'C:/Proyectos/RED SOCIAL HSOCIAL/src/components/profile/ProfileIntroAudioBar.tsx';
let c = fs.readFileSync(p, 'utf8');

// Step 1: Add prevUrl state after the existing state declarations
// Find the line with useState(false) for isPlaying then currentTime
const stateBlock = '  const [isSaving, setIsSaving] = useState(false);\r\n  const [isPlaying, setIsPlaying] = useState(false);\r\n  const [currentTime, setCurrentTime] = useState(0);\r\n\r\n  const audioRef';
const stateBlockNew = '  const [isSaving, setIsSaving] = useState(false);\r\n  const [isPlaying, setIsPlaying] = useState(false);\r\n  const [currentTime, setCurrentTime] = useState(0);\r\n  const [prevUrl, setPrevUrl] = useState(url);\r\n\r\n  if (prevUrl !== url) {\r\n    setPrevUrl(url);\r\n    setIsPlaying(false);\r\n    setCurrentTime(0);\r\n  }\r\n\r\n  const audioRef';

if (!c.includes(stateBlock)) {
  process.stdout.write('stateBlock not found, trying LF...\n');
  const stateBlockLF = stateBlock.replace(/\r\n/g, '\n');
  const stateBlockNewLF = stateBlockNew.replace(/\r\n/g, '\n');
  if (!c.includes(stateBlockLF)) {
    process.stdout.write('stateBlock LF also not found!\n');
    process.exit(1);
  }
  c = c.replace(stateBlockLF, stateBlockNewLF);
} else {
  c = c.replace(stateBlock, stateBlockNew);
}
process.stdout.write('Step 1 done\n');

// Step 2: Remove the reset useEffect
const resetEffect = '  useEffect(() => {\r\n    // Reset state when audio source changes\r\n    setIsPlaying(false);\r\n    setCurrentTime(0);\r\n  }, [url]);\r\n\r\n';
const resetEffectLF = '  useEffect(() => {\n    // Reset state when audio source changes\n    setIsPlaying(false);\n    setCurrentTime(0);\n  }, [url]);\n\n';

if (c.includes(resetEffect)) {
  c = c.replace(resetEffect, '');
  process.stdout.write('Step 2 done (CRLF)\n');
} else if (c.includes(resetEffectLF)) {
  c = c.replace(resetEffectLF, '');
  process.stdout.write('Step 2 done (LF)\n');
} else {
  process.stdout.write('resetEffect pattern not found!\n');
  process.exit(1);
}

fs.writeFileSync(p, c, 'utf8');
process.stdout.write('File saved\n');
