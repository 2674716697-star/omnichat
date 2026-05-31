import { execSync } from 'child_process';

const STEPS = [
  ['1/5 REVIEW BEFORE BUILD', 'node _review.mjs'],
  ['2/5 STABILITY BEFORE BUILD', 'node _check_stability.mjs'],
  ['3/5 BUILD', 'node _build.js'],
  ['4/5 STABILITY AFTER BUILD', 'node _check_stability.mjs'],
  ['5/5 REVIEW AFTER BUILD', 'node _review.mjs'],
];

let failed = false;

for (const [label, cmd] of STEPS) {
  console.log(`\n=== ${label} ===`);
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch (e) {
    console.error(`\n❌ FAILED: ${label}`);
    failed = true;
    break;
  }
}

console.log('\n=== GIT STATUS ===');
try {
  const status = execSync('git status --short', { encoding: 'utf8' }).trim();
  if (status) {
    const lines = status.split('\n').filter(Boolean);
    const nonClaude = lines.filter(l => !l.includes('CLAUDE.md'));
    console.log(status);
    if (nonClaude.length === 0) {
      console.log('(only CLAUDE.md untracked — considered clean)');
    } else {
      console.log('⚠️  Untracked or modified files present (excluding CLAUDE.md).');
    }
  } else {
    console.log('(clean)');
  }
} catch (e) {
  console.log('(git status unavailable)');
}

if (failed) {
  console.error('\n❌ SAFE CHECK FAILED');
  process.exit(1);
}

console.log('\n✅ SAFE CHECK PASSED');
