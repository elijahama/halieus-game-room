import assert from "node:assert/strict";
import { groupOwnedPortfolio } from "../client/src/games/mega-board/components/PlayerRail.tsx";
import { BOARD_SPACES, isOwnableBoardSpace } from "../shared/games/mega-board/board.ts";

const groups = (ids) => groupOwnedPortfolio(new Set(ids));
assert.deepEqual(groups([]), []);
const brownMajority = groups([1, 3]);
assert.deepEqual(brownMajority.map(({ key, owned, collapsedLabel }) => [key, owned.map(x => x.id), collapsedLabel]), [["brown", [1, 3], "Majority set"]]);
assert.equal(groups([1, 3, 4])[0].collapsedLabel, "Full set");
assert.equal(groups([1])[0].collapsedLabel, null);
assert.equal(groups([7, 8, 11, 12])[0].collapsedLabel, "Full set");
assert.equal(groups([48, 49])[0].collapsedLabel, "Majority set");
assert.equal(groups([6, 20, 33])[0].key, "stations");
assert.equal(groups([6, 20, 33])[0].collapsedLabel, "Majority set");
assert.equal(groups([10, 17])[0].key, "utilities");
assert.equal(groups([10, 17])[0].collapsedLabel, "Majority set");
assert.equal(groups([10, 17, 36])[0].collapsedLabel, "Full set");

const allOwned = BOARD_SPACES.filter(isOwnableBoardSpace).map(space => space.id);
const complete = groups(allOwned);
assert.deepEqual(complete.map(group => group.key), [
  "brown", "light-blue", "pink", "orange", "red", "yellow",
  "green", "dark-blue", "stations", "utilities",
]);
assert.deepEqual(complete.flatMap(group => group.owned.map(space => space.id)).sort((a, b) => a - b), allOwned.sort((a, b) => a - b), "Every owned asset appears exactly once");
assert.ok(complete.every(group => group.collapsedLabel === "Full set"));
console.log("PASS canonical colour/station/utility grouping, exact majority/full threshold, every asset once");
