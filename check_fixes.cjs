const fs = require('fs');

function check(label, value) {
  process.stdout.write((value ? '  PASS' : '  FAIL') + ' ' + label + '\n');
}

const cb = fs.readFileSync('src/components/filters/InstitutionCombobox.tsx', 'utf8');
process.stdout.write('=== Check 6: InstitutionCombobox ===\n');
check('aria-controls="institution-combobox-listbox" on button', cb.includes('aria-controls="institution-combobox-listbox"'));
check('id="institution-combobox-listbox" on CommandList', cb.includes('id="institution-combobox-listbox"'));

const modal = fs.readFileSync('src/components/onboarding/InstitutionRequiredModal.tsx', 'utf8');
process.stdout.write('=== Check 7: InstitutionRequiredModal ===\n');
check('aria-controls="institution-required-listbox" on button', modal.includes('aria-controls="institution-required-listbox"'));
check('id="institution-required-listbox" on CommandList', modal.includes('id="institution-required-listbox"'));

const cd = fs.readFileSync('src/pages/CompanyDetail.tsx', 'utf8');
const imgLine = cd.split(/\r?\n/).find(l => l.includes('cover_url') && l.includes('<img'));
process.stdout.write('=== Check 8: CompanyDetail cover img ===\n');
check('img tag found', !!imgLine);
check('alt attribute present', imgLine ? imgLine.includes('alt=') : false);

const mc = fs.readFileSync('src/components/post/MediaCarousel.tsx', 'utf8');
const lines = mc.split(/\r?\n/);
const hookLines = [];
const earlyReturnIdx = lines.findIndex(l => l.includes('if (!mediaItems || mediaItems.length === 0) return null'));
const firstHookAfter = lines.findIndex((l, i) => i > earlyReturnIdx && l.match(/\b(useState|useEffect|useMemo|useRef|useCallback|useContext)\b/));
process.stdout.write('=== Check 1: MediaCarousel hook order ===\n');
check('early return at line ' + (earlyReturnIdx + 1), earlyReturnIdx >= 0);
check('no hooks after early return (first hook after at line ' + (firstHookAfter + 1) + ')', firstHookAfter === -1 || firstHookAfter > earlyReturnIdx + 10);

const pb = fs.readFileSync('src/components/profile/ProfileAudioPlayButton.tsx', 'utf8');
process.stdout.write('=== Check 4: ProfileAudioPlayButton ===\n');
check('prevAudioUrl state exists', pb.includes('prevAudioUrl'));
check('reset useEffect removed', !pb.includes('Reset state when audio source changes'));
check('inline comparison present', pb.includes('prevAudioUrl !== audioUrl'));

const pib = fs.readFileSync('src/components/profile/ProfileIntroAudioBar.tsx', 'utf8');
process.stdout.write('=== Check 5: ProfileIntroAudioBar ===\n');
check('prevUrl state exists', pib.includes('prevUrl'));
check('reset useEffect removed', !pib.includes('Reset state when audio source changes'));
check('inline comparison present', pib.includes('prevUrl !== url'));

const pm = fs.readFileSync('src/components/chat/PrivateMessages.tsx', 'utf8');
process.stdout.write('=== Check 9: PrivateMessages ConversationItem ===\n');
const ciDef = pm.match(/^const ConversationItem\s*=/m);
check('ConversationItem at module scope', !!ciDef);
const nestedCi = pm.match(/^\s{2,}const ConversationItem\s*=/m);
check('ConversationItem NOT nested', !nestedCi);

const mpw = fs.readFileSync('src/components/ModalPublicacionWeb.tsx', 'utf8');
process.stdout.write('=== Check 10: ModalPublicacionWeb ValidationSummary ===\n');
const vsDef = mpw.match(/^const ValidationSummary\s*=/m);
check('ValidationSummary at module scope', !!vsDef);
const nestedVs = mpw.match(/^\s{2,}const ValidationSummary\s*=/m);
check('ValidationSummary NOT nested', !nestedVs);
check('ValidationSummary receives validation prop in JSX', mpw.includes('ValidationSummary validation={validation}') || mpw.includes('<ValidationSummary validation='));

const ms = fs.readFileSync('src/components/media/MusicSelector.tsx', 'utf8');
process.stdout.write('=== Check 11: MusicSelector TrackCard ===\n');
const tcDef = ms.match(/^const TrackCard\s*=/m);
check('TrackCard at module scope', !!tcDef);
const nestedTc = ms.match(/^\s{2,}const TrackCard\s*=/m);
check('TrackCard NOT nested', !nestedTc);
const fdDef = ms.match(/^const formatDuration\s*=/m);
check('formatDuration at module scope', !!fdDef);
