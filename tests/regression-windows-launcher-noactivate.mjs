import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const generator = fs.readFileSync(path.join(root, 'scripts/windows/launcher-shortcuts.ps1'), 'utf8');
const runner = fs.readFileSync(path.join(root, 'scripts/windows/launcher-noactivate.vbs'), 'utf8');

assert.match(generator, /\$NoActivateRunner\s*=\s*Join-Path\s+\$ProjectRoot\s+'scripts\\windows\\launcher-noactivate\.vbs'/i);
assert.match(generator, /\$WindowsScriptHost\s*=\s*Join-Path\s+\$env:SystemRoot\s+'System32\\wscript\.exe'/i);
assert.match(generator, /\$shortcut\.TargetPath\s*=\s*\$WindowsScriptHost/);
assert.match(generator, /\$shortcut\.Arguments\s*=\s*"\/\/B \/\/Nologo/);
assert.match(generator, /\$arguments\.IndexOf\(\$NoActivateRunner/);
assert.match(generator, /\$openShard\.TargetPath\s*=\s*\$cmd/);
assert.match(generator, /\$terminal\.TargetPath\s*=\s*\$WindowsTerminal\.Source/);
assert.match(runner, /shell\.Run command,\s*4,\s*False/i);
assert.match(runner, /%ComSpec%/);
assert.doesNotMatch(runner, /shell\.Run command,\s*1,/i);

console.log('HGR Windows nonactivating launch contracts PASS');
