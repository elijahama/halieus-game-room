import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=(p)=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const json=(p)=>JSON.parse(read(p));

assert.match(read('VERSION').trim(),/^(?:3\.7\.0[g-l]|4\.0\.0)$/);
for(const file of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) {
  assert.match(json(file).version,/^(?:3\.7\.0-[g-l]|4\.0\.0)$/,`${file} version mismatch`);
}

const rootPackage=json('package.json');
assert.match(rootPackage.scripts['test:regression'],/regression-3\.7\.0f\.mjs.*regression-3\.7\.0g\.mjs/s,'Regression chain must preserve 3.7.0f before 3.7.0g');

const debtPanel=read('client/src/games/mega-board/components/DebtPanel.tsx');
assert.match(debtPanel,/Emergency property options/,'Debt UI must expose immediate emergency property controls');
assert.match(debtPanel,/Mortgage clear properties or sell buildings/,'Debt UI must explain direct liquidation choices');
assert.match(debtPanel,/onMortgage\(space\.id\)/,'Debt UI must mortgage a selected property directly');
assert.match(debtPanel,/onSellBuilding\(space\.id\)/,'Debt UI must sell a selected building directly');
assert.match(debtPanel,/development === highestDevelopment/,'Debt UI must respect even-selling before enabling building sales');
assert.match(debtPanel,/bankInventory\.houses >= 4/,'Debt UI must respect hotel downgrade inventory');
assert.match(debtPanel,/bankInventory\.hotels >= 1/,'Debt UI must respect skyscraper downgrade inventory');

const sidebar=read('client/src/games/mega-board/components/GameSidebar.tsx');
assert.match(sidebar,/onMortgage=\{onMortgage\}/,'Sidebar must wire mortgage actions into debt resolution');
assert.match(sidebar,/onSellBuilding=\{onSellBuilding\}/,'Sidebar must wire building-sale actions into debt resolution');

const assetHandlers=read('server/src/games/mega-board/handlers/assetHandlers.ts');
assert.match(assetHandlers,/"optional-actions",\s*"jail-decision",\s*"debt"/s,'Mortgage and sale handlers must remain legal during debt resolution');
assert.match(assetHandlers,/settleDebtIfAffordable\(\s*gameState,?\s*\)/s,'Manual asset liquidation must settle the debt as soon as enough cash exists');

const css=read('client/src/index.css');
assert.match(css,/\.debt-property-options\s*\{/,'Debt property controls must have a dedicated compact layout');
assert.match(css,/\.debt-property-option-list\s*\{/,'Debt property choices must scroll safely when a portfolio is large');

console.log('Halieus Game Room 3.7.0g direct debt property liquidation regression: PASS');
