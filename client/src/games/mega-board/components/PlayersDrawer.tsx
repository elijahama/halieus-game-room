import { useEffect, useState, type ComponentProps } from "react";
import { createPortal } from "react-dom";
import { PlayerRail } from "./PlayerRail";

type Props = Pick<ComponentProps<typeof PlayerRail>, "lobby" | "gameState" | "spectators" | "theme" | "onPlayerSelect"> & { onClose: () => void };

/** Keep the real drawer in the active fullscreen root, including transitions while open. */
export function PlayersDrawer({ lobby, gameState, spectators, theme, onPlayerSelect, onClose }: Props) {
  const [target, setTarget] = useState<Element>(() => document.fullscreenElement ?? document.body);
  useEffect(() => {
    const update = () => setTarget(document.fullscreenElement ?? document.body);
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);
  return createPortal(
          <div
            className="tablet-players-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                onClose();
              }
            }}
          >
            <aside
              id="tablet-players-drawer"
              className="tablet-players-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Players and spectators"
            >
              <header className="tablet-players-drawer-header">
                <div>
                  <span>Match</span>
                  <strong>Players</strong>
                </div>
                <button
                  type="button"
                  aria-label="Close players"
                  onClick={() => onClose()}
                >
                  ×
                </button>
              </header>
              <PlayerRail
                lobby={lobby}
                gameState={gameState}
                isSpectator={false}
                spectators={spectators}
                onPlayerSelect={onPlayerSelect}
                theme={theme}
              />
            </aside>
          </div>,
    target,
  );
}
