const fs = require('fs');
const filePath = 'C:\\Proyectos\\RED SOCIAL HSOCIAL\\src\\components\\media\\MusicSelector.tsx';

let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

const START = '\n  const formatDuration = (seconds: number) => {';
const TRACKCARD_END_CTX = '\n  );\n\n  return (';
const TRACKCARD_END_SUFFIX = '\n  );';

const si = content.indexOf(START);
if (si === -1) throw new Error('formatDuration start not found');
const ei = content.indexOf(TRACKCARD_END_CTX, si);
if (ei === -1) throw new Error('TrackCard end not found');

const sectionEnd = ei + TRACKCARD_END_SUFFIX.length;
const section = content.slice(si, sectionEnd);

const tcSignatureStart = section.indexOf('\n  const TrackCard = ');
if (tcSignatureStart === -1) throw new Error('TrackCard signature not found in section');

const tcBodyStartOff = section.indexOf('=> (\n', tcSignatureStart) + '=> (\n'.length;
const tcBodyEndOff = section.lastIndexOf('\n  );');
const tcBodyRaw = section.slice(tcBodyStartOff, tcBodyEndOff);

const tcBodyModuleScope = tcBodyRaw.split('\n').map(line => {
  if (line.startsWith('  ')) return line.slice(2);
  return line;
}).join('\n');

const newComp = `
const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return \`\${mins}:\${secs.toString().padStart(2, '0')}\`;
};

interface TrackCardProps {
  track: MusicTrack & { audio_analysis: any };
  handleTrackSelect: (track: MusicTrack & { audio_analysis: any }) => void;
  playPreview: (track: MusicTrack, event: React.MouseEvent) => void;
  currentlyPlaying: string | null;
  toggleFavorite: (trackId: string, event: React.MouseEvent) => void;
  favorites: string[];
}

const TrackCard = ({ track, handleTrackSelect, playPreview, currentlyPlaying, toggleFavorite, favorites }: TrackCardProps) => (
${tcBodyModuleScope}
);
`;

content = content.slice(0, si) + content.slice(sectionEnd);

const INSERT_BEFORE = '\nexport function MusicSelector(';
const ii = content.indexOf(INSERT_BEFORE);
if (ii === -1) throw new Error('MusicSelector insertion point not found');

content = content.slice(0, ii) + newComp + content.slice(ii);

content = content.replace(
  '<TrackCard key={track.id} track={track} />',
  '<TrackCard key={track.id} track={track} handleTrackSelect={handleTrackSelect} playPreview={playPreview} currentlyPlaying={currentlyPlaying} toggleFavorite={toggleFavorite} favorites={favorites} />'
);

fs.writeFileSync(filePath, content.replace(/\n/g, '\r\n'), 'utf8');
console.log('fix3.cjs done!');
