import type { GameCatalogEntry, GameCategory } from "./catalog";

/** A searchable view of existing, currently available games; never unlocks roadmap entries. */
export type GameLibraryCategory = "all" | GameCategory;
type SearchableGame = Pick<GameCatalogEntry, "id" | "name" | "subtitle" | "category">;

/** Pure, order-preserving filter for HGR's game catalogue. No third-party code or assets. */
export function filterGameLibrary<T extends SearchableGame>(
  games: readonly T[], query: string, category: GameLibraryCategory,
): T[] {
  const words = query.normalize("NFKC").trim().toLocaleLowerCase().split(/\s+/u).filter(Boolean);
  return games.filter((game) => {
    if (category !== "all" && game.category !== category) return false;
    const searchable = `${game.name} ${game.subtitle} ${game.category}`.normalize("NFKC").toLocaleLowerCase();
    return words.every((word) => searchable.includes(word));
  });
}
