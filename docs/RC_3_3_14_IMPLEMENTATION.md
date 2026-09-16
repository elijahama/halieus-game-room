# RC 3.3.14 Repair

This repair release fixes a mixed-source client build failure seen after extracting RC 3.3.13 over an older folder.

- Ensures the `PlayerMatchStats` fallback objects in `WinnerScreen.tsx` and `gameReport.ts` include `finishPosition`.
- Ships the complete current source tree (without `node_modules`) from the project root so overwrite extraction is unambiguous.
- Aligns root, client, and server release metadata at `0.22.9-rc.3.3.14`.
- Adds a launcher guard that reports a mixed release folder clearly instead of proceeding into confusing TypeScript failures.
- Preserves all RC 3.3.12/3.3.13 gameplay and background-launcher changes.
