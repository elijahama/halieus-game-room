import type { GameLibraryCategory } from "../games/libraryDiscovery";

interface Props {
  query: string;
  category: GameLibraryCategory;
  count: number;
  onQueryChange: (value: string) => void;
  onCategoryChange: (value: GameLibraryCategory) => void;
}

/** Compact and accessible HGR-native catalogue search; never mutates game availability. */
export function GameLibrarySearchPanel({ query, category, count, onQueryChange, onCategoryChange }: Props) {
  const clear = () => { onQueryChange(""); onCategoryChange("all"); };
  return <section className="hgr-library-search-panel" aria-label="Find a game">
    <div className="hgr-library-search-top">
      <label htmlFor="hgr-game-library-search">Find a game</label>
      <input id="hgr-game-library-search" type="search" autoComplete="off"
        placeholder="Search games and descriptions" value={query}
        onChange={(event) => onQueryChange(event.target.value)} />
      {(query || category !== "all") && <button type="button" className="hgr-library-search-reset"
        onClick={clear}>Clear filters</button>}
    </div>
    <div className="hgr-library-filter-chips" role="group" aria-label="Game category">
      {([["all", "All Games"], ["board", "Board"], ["cards", "Cards"], ["social", "Social"]] as const).map(([id, label]) =>
        <button type="button" key={id} className={category === id ? "is-active" : ""}
          aria-pressed={category === id} onClick={() => onCategoryChange(id)}>{label}</button>)}
    </div>
    <p role="status" aria-live="polite">{count} {count === 1 ? "game" : "games"} found</p>
  </section>;
}
