import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const css = fs.readFileSync(path.join(root, 'client/src/index.css'), 'utf8');
const component = fs.readFileSync(path.join(root, 'client/src/games/mega-board/components/PlayerDetailsModal.tsx'), 'utf8');

const requiredSelectors = [
  '.player-detail-backdrop',
  '.player-detail-modal',
  '.player-detail-header',
  '.player-detail-token',
  '.player-detail-close',
  '.player-detail-status-row',
  '.player-detail-portfolio-heading',
  '.player-detail-assets',
  '.player-detail-asset',
  '.player-detail-actions',
  '.player-detail-primary',
];

for (const selector of requiredSelectors) {
  if (!css.includes(selector)) throw new Error(`Missing Player Details CSS selector: ${selector}`);
  const className = selector.slice(1);
  if (!component.includes(className)) throw new Error(`Player Details component no longer uses expected class: ${className}`);
}

if (!/position:\s*fixed/.test(css.slice(css.indexOf('.player-detail-backdrop'), css.indexOf('.player-detail-modal')))) {
  throw new Error('Player Details backdrop must remain fixed to the viewport');
}
if (!/max-height:\s*min\(88vh/.test(css)) {
  throw new Error('Player Details modal must remain viewport constrained');
}
if (!/overflow-y:\s*auto/.test(css.slice(css.indexOf('.player-detail-assets')))) {
  throw new Error('Player Details asset list must remain scrollable');
}

console.log('RC 3.3.20b Player Details stylesheet regression: PASS');
