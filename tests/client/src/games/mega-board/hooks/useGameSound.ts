import {
  useEffect,
  useRef,
} from "react";
import type {
  GameState,
} from "../../../../../shared/games/mega-board/game-state";

/**
 * Mega Board's lightweight tone engine is scoped to the visible game module.
 * Keeping contexts/timeouts in the hook lets navigation immediately silence
 * a parked game while preserving its server state for Continue/recovery.
 */
export function useGameSound(
  gameState: GameState | null,
  enabled: boolean,
  active: boolean,
): void {
  const previousRollKey = useRef<string | null>(null);
  const previousTurn = useRef<number | null>(null);
  const previousWinner = useRef<string | null>(null);
  const activeRef = useRef(active && enabled);
  const timeoutIds = useRef<Set<number>>(new Set());
  const contexts = useRef<Set<AudioContext>>(new Set());

  // The current audible state is checked again by delayed notes so switching
  // games cannot leak already-scheduled Mega Board sounds into Poker.
  useEffect(() => {
    activeRef.current = active && enabled;
    if (activeRef.current) return;

    for (const timeoutId of timeoutIds.current) window.clearTimeout(timeoutId);
    timeoutIds.current.clear();

    for (const context of contexts.current) {
      void context.close().catch(() => undefined);
    }
    contexts.current.clear();
  }, [active, enabled]);

  function playTone(frequency: number, durationMs: number, volume = 0.045): void {
    if (!activeRef.current) return;

    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextClass) return;

    const context = new AudioContextClass();
    contexts.current.add(context);
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + durationMs / 1000);

    oscillator.addEventListener("ended", () => {
      contexts.current.delete(context);
      void context.close().catch(() => undefined);
    }, { once: true });
  }

  function queueTone(delayMs: number, frequency: number, durationMs: number): void {
    const timeoutId = window.setTimeout(() => {
      timeoutIds.current.delete(timeoutId);
      if (activeRef.current) playTone(frequency, durationMs);
    }, delayMs);
    timeoutIds.current.add(timeoutId);
  }

  // State changes drive short feedback tones only while Mega Board is active.
  useEffect(() => {
    if (!gameState) {
      previousRollKey.current = null;
      previousTurn.current = null;
      previousWinner.current = null;
      return;
    }

    const roll = gameState.lastDiceRoll;
    const rollKey = roll
      ? `${gameState.turnNumber}:${roll.white1}:${roll.white2}:${String(roll.speed)}`
      : null;

    if (activeRef.current && rollKey && previousRollKey.current && rollKey !== previousRollKey.current) {
      playTone(330, 85);
      queueTone(95, 440, 110);
    }

    if (activeRef.current && previousTurn.current !== null && gameState.turnNumber !== previousTurn.current) {
      playTone(520, 120);
    }

    if (activeRef.current && gameState.winnerId && previousWinner.current !== gameState.winnerId) {
      playTone(523, 120);
      queueTone(140, 659, 150);
      queueTone(310, 784, 220);
    }

    previousRollKey.current = rollKey;
    previousTurn.current = gameState.turnNumber;
    previousWinner.current = gameState.winnerId;
  }, [gameState]);

  // Unmount cleanup protects against audio leaks during route/module changes.
  useEffect(() => () => {
    for (const timeoutId of timeoutIds.current) window.clearTimeout(timeoutId);
    timeoutIds.current.clear();
    for (const context of contexts.current) void context.close().catch(() => undefined);
    contexts.current.clear();
  }, []);
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
