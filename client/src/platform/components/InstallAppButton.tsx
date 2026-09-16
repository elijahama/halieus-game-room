import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export function InstallAppButton() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setInstalled(standalone);
    const onPrompt = (event: Event) => { event.preventDefault(); setPromptEvent(event as BeforeInstallPromptEvent); };
    const onInstalled = () => { setInstalled(true); setPromptEvent(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);
  if (installed) return null;
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (!promptEvent && !isIos) return null;
  return <>
    <button type="button" className="halieus-install-app" onClick={async () => {
      if (promptEvent) { await promptEvent.prompt(); const result = await promptEvent.userChoice; if (result.outcome === "accepted") setPromptEvent(null); return; }
      if (isIos) setIosHint((value) => !value);
    }}><span>⇩</span><b>Install HGR</b></button>
    {iosHint && <div className="halieus-install-hint" role="status">On iPhone/iPad: open Share, choose <b>Add to Home Screen</b>, then <b>Add</b>.</div>}
  </>;
}
