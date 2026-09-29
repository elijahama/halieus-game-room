import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");

const contract = read("shared/platform/control.ts");
const agent = read("server/src/control-agent.ts");
const rootPackage = JSON.parse(read("package.json"));
const serverPackage = JSON.parse(read("server/package.json"));
const masterbook = read("docs/HGR_MASTERBOOK.md");
const controlDoc = read("docs/HGR_MOBILE_CONTROL.md");
const docsIndex = read("docs/README.md");
const projectReadme = read("README.md");
const controlStartHelper = read("scripts/windows/start-control-agent.ps1");
const controlClientHelper = read("scripts/windows/hgr-control-client.ps1");
const controlLauncher = read("Start HGR Control.cmd");
const controlLauncherAlias = read("Start-HGR-Control.cmd");
const controlClientEntry = read("HGR-Control.cmd");
const controlStartBridge = read("scripts/windows/control-start.ps1");
const controlRestartBridge = read("scripts/windows/control-restart.ps1");
const controlCloseBridge = read("scripts/windows/control-close.ps1");
const controlUpdateBridge = read("scripts/windows/control-update.ps1");
const updateLauncher = read("Update HGR GitHub.cmd");
const controlMobileHelper = read("scripts/windows/start-control-mobile.ps1");
const controlMobileLauncher = read("Start HGR Control Mobile.cmd");
const controlMobileLauncherAlias = read("Start-HGR-Control-Mobile.cmd");
const controlUiHtml = read("server/control-ui/index.html");
const controlUiJs = read("server/control-ui/control.js");
const controlManifest = read("server/control-ui/manifest.webmanifest");
const controlServiceWorker = read("server/control-ui/sw.js");
const controlCss = read("server/control-ui/control.css");
const launcherIconGenerator = read("scripts/windows/generate-launcher-icons.ps1");
const serverIndex = read("server/src/index.ts");
const clientMain = read("client/src/main.tsx");
const maintenanceBanner = read("client/src/platform/components/PlatformMaintenanceBanner.tsx");
const maintenanceBannerCss = read("client/src/platform/components/PlatformMaintenanceBanner.css");
const maintenanceContract = read("shared/platform/maintenance.ts");
const oracleQuickInstall = read("tests/dev-tools/Oracle Quick Deploy/quick-install.sh");
const postUpdateClient = read("scripts/windows/post-update-client.ps1");
const releaseIntegrity = read("scripts/release-integrity.mjs");
const oraclePacker = read("tests/dev-tools/Oracle Quick Deploy/deploy-from-windows.ps1");
const oraclePackageRegression = read("tests/package-oracle-4.0.0.ps1");
const gitignore = read(".gitignore");

for (const id of [
  "status",
  "start",
  "restart",
  "close",
  "update",
  "logs",
  "open-site",
  "open-github",
]) {
  assert.match(contract, new RegExp(`id: "${id}"`), `HGR Control contract must include ${id}`);
}

assert.doesNotMatch(
  contract,
  /(?:command|executable|shell|argv|args)\s*:/i,
  "Phone-facing control contract must never expose arbitrary command/executable fields",
);
assert.match(
  contract,
  /id: "restart"[\s\S]*?without updating or deploying/s,
  "Restart must remain troubleshooting-only in the shared control contract",
);
assert.match(
  contract,
  /id: "update"[\s\S]*?update\/validation\/deploy flow[\s\S]*?refresh the existing client or open HGR if it was closed/s,
  "Update must retain the full update/deploy/client-refresh responsibility",
);
assert.match(
  contract,
  /id: "close"[\s\S]*?confirmation: "confirm"/s,
  "Close must require confirmation",
);
assert.match(
  contract,
  /id: "update"[\s\S]*?confirmation: "confirm"/s,
  "Update must require confirmation",
);

assert.match(agent, /function isHgrRepositoryRoot\(candidate: string\)/, "Control agent must verify the real HGR repository root rather than any VERSION file");
assert.match(agent, /metadata\.name === "halieus-game-room"/, "Control agent must identify the root package by the canonical repository package name");
assert.match(agent, /existsSync\(resolve\(candidate, "client"\)\)[\s\S]*?existsSync\(resolve\(candidate, "server"\)\)[\s\S]*?existsSync\(resolve\(candidate, "shared"\)\)/s, "Control root detection must require the HGR workspace directories");
assert.doesNotMatch(agent, /candidates\.find\(\(candidate\) => existsSync\(resolve\(candidate, "VERSION"\)\)\)/, "A nested VERSION file must never be enough to identify the repository root");
assert.match(agent, /HGR_CONTROL_HOST\?\.trim\(\) \|\| "127\.0\.0\.1"/, "Control agent must bind to loopback by default");
assert.match(agent, /HGR_CONTROL_PORT \|\| "43127"/, "Control agent must keep one documented default port");
assert.match(agent, /Refusing to expose HGR Control beyond loopback without HGR_CONTROL_TOKEN/, "Non-loopback control must require a token");
assert.match(agent, /request\.method === "GET" && request\.url === "\/api\/status"/, "Foundation agent must expose a read-only status endpoint");
assert.match(agent, /implemented: action\.id !== "open-site" && action\.id !== "open-github"/, "Implemented Control actions must include status/start/restart/close/update/logs while links remain staged");
assert.match(agent, /execFileAsync\("git"/, "Foundation agent may use fixed read-only Git inspection");
assert.match(agent, /gitValue\(\["status", "--porcelain", "--untracked-files=no"\], true\)/, "Clean git status output must be preserved as an empty string rather than null");
assert.match(agent, /allowEmpty[\s\S]*?stdout\.replace\(\/\(\?:\\r\?\\n\)\+\$\/, ""\)/, "Git helper must preserve Git porcelain status columns when empty output is allowed");
assert.match(agent, /line\.slice\(3\)\.trim\(\)/, "Remote Update must parse paths after the two status columns plus separator");
assert.match(agent, /new Set\(\["RELEASE\.json", "shared\/release\.ts"\]\)/, "Remote Update must tolerate generated release identity drift");
assert.match(agent, /dirty: porcelain === null \? null : porcelain\.length > 0/, "Repository dirty state must distinguish clean false from unavailable null");
assert.doesNotMatch(agent, /\bexec\s*\(/, "Control agent must not use shell exec");
assert.doesNotMatch(agent, /\bspawn\s*\(/, "Control agent foundation must not spawn arbitrary processes");
assert.doesNotMatch(agent, /request\.(?:body|query)[\s\S]*?(?:command|exe|args)/i, "Control endpoint must not accept arbitrary execution input");
assert.match(agent, /timingSafeEqual\(expectedBytes, providedBytes\)/, "Bearer token comparison must use timing-safe equality");
assert.match(agent, /Set HGR_CONTROL_TOKEN before enabling mutable HGR Control actions/, "Mutable actions must refuse to run without an explicit token");
assert.match(agent, /request\.method === "POST" && request\.url === "\/api\/actions\/start"/, "Start must use a fixed authenticated endpoint");
assert.match(agent, /request\.method === "POST" && request\.url === "\/api\/actions\/restart"/, "Restart must be exposed only through the fixed restart endpoint");
assert.match(agent, /request\.method === "POST" && request\.url === "\/api\/actions\/close"/, "Close must use a fixed authenticated endpoint");
assert.match(agent, /request\.method === "POST" && request\.url === "\/api\/actions\/update"/, "Update must use a fixed authenticated endpoint");
assert.match(agent, /request\.method === "POST" && request\.url === "\/api\/confirm"/, "Confirmation actions must use a dedicated fixed confirmation endpoint");
assert.match(agent, /ACTION_CONFIRMATION_TTL_MS = 30 \* 1000/, "Close and Update confirmations must be short lived");
assert.match(agent, /consumeActionConfirmation\(request, "close", body\)/, "Close must consume a one-time server confirmation");
assert.match(agent, /consumeActionConfirmation\(request, "update", body\)/, "Update must consume a one-time server confirmation");
assert.match(agent, /const startScript = resolve\(projectRoot, "Start Halieus Game Room\.cmd"\)/, "Start action must map to the fixed repository launcher");
assert.match(agent, /const restartScript = resolve\(projectRoot, "Restart Halieus Game Room\.cmd"\)/, "Restart action must map to the fixed repository restart launcher");
assert.match(agent, /const closeScript = resolve\(projectRoot, "Close Halieus Game Room\.cmd"\)/, "Close action must map to the fixed repository launcher");
assert.match(agent, /const updateScript = resolve\(projectRoot, "Update HGR GitHub\.cmd"\)/, "Update action must map to the fixed approved updater");
assert.match(agent, /const startBridge = resolve\(projectRoot, "scripts", "windows", "control-start\.ps1"\)/, "Start action must use the fixed Windows bridge");
assert.match(agent, /const restartBridge = resolve\(projectRoot, "scripts", "windows", "control-restart\.ps1"\)/, "Restart action must use the fixed Windows bridge");
assert.match(agent, /const closeBridge = resolve\(projectRoot, "scripts", "windows", "control-close\.ps1"\)/, "Close action must use the fixed Windows bridge");
assert.match(agent, /const updateBridge = resolve\(projectRoot, "scripts", "windows", "control-update\.ps1"\)/, "Update action must use the fixed Windows bridge");
assert.match(agent, /execFileAsync\([\s\S]*?"powershell\.exe"[\s\S]*?"-File",[\s\S]*?restartBridge/s, "Restart action must invoke the fixed bridge without cmd.exe quoting");
assert.doesNotMatch(agent, /ComSpec|cmd\.exe[\s\S]*?restartScript/i, "Control Agent must not launch the spaced restart CMD through cmd.exe quoting");
assert.match(agent, /activeOperation: HalieusControlActiveOperation \| null = null/, "Mutable control actions must have a single-operation lock");
assert.match(agent, /if \(activeOperation\)/, "Restart must reject concurrent mutable operations");
assert.match(agent, /hgr-control-audit\.ndjson/, "Mutable actions must write a dedicated audit trail");
assert.match(agent, /state: "running"/, "Restart audit must record operation start");
assert.match(agent, /state: "succeeded"/, "Restart audit must record success");
assert.match(agent, /state: "failed"/, "Restart audit must record failure");
assert.match(agent, /request\.method === "GET" && request\.url === "\/api\/logs"/, "Authenticated audit log endpoint must exist");
assert.doesNotMatch(agent, /execFileAsync\([^,]+,\s*request\./s, "Request data must never become an executable or command path");
assert.doesNotMatch(agent, /restartScript\s*=\s*request\./, "Restart script path must never come from the request");

assert.equal(rootPackage.scripts["control:dev"], "npm --workspace server run control:dev");
assert.equal(rootPackage.scripts["control:start"], "npm --workspace server run control:start");
assert.equal(serverPackage.scripts["control:dev"], "tsx src/control-agent.ts");
assert.equal(serverPackage.scripts["control:start"], "node dist/server/src/control-agent.js");
assert.match(rootPackage.scripts["test:regression"], /regression-control-agent\.mjs/, "Control regression must remain in the full regression chain");

assert.match(masterbook, /Living project summary and engineering map/, "Masterbook must state its source-of-truth role");
assert.match(masterbook, /human-directed, AI-assisted engineering/i, "Masterbook must document HGR's development model");
assert.match(masterbook, /HGR Control — phone launcher\/control plane/, "Masterbook must include the mobile-control architecture");
assert.match(controlDoc, /The goal is not “remote command prompt from a phone\.”/, "Control documentation must reject generic remote-shell design");
assert.match(controlDoc, /Loopback by default/, "Control documentation must explain the initial network boundary");
assert.match(controlDoc, /Stage A — understand one GET endpoint/, "Control documentation must contain the guided implementation walkthrough");
assert.match(controlDoc, /POST \/api\/actions\/restart/, "Control documentation must explain the authenticated restart endpoint");
assert.match(controlStartHelper, /node -e "process\.stdout\.write\(require\('node:crypto'\)\.randomBytes\(32\)\.toString\('base64'\)\)"/, "Control launcher helper must use HGR's Node runtime for cryptographic token generation");
assert.doesNotMatch(controlDoc, /node -e "process\.stdout\.write\(require\('node:crypto'\)\.randomBytes\(32\)/, "Operator docs must not require manual token generation now that the launcher owns it");
assert.match(controlDoc, /\.\\Start HGR Control\.cmd/, "Control walkthrough must use the stable local Control launcher");
assert.match(controlDoc, /\.\\HGR-Control\.cmd status/, "Control walkthrough must use the stable allow-listed root client for status");
assert.match(controlDoc, /\.\\HGR-Control\.cmd restart/, "Control walkthrough must use the stable allow-listed root client for restart");
assert.doesNotMatch(controlDoc, /Set-Clipboard|Get-Clipboard|PASTE-THE-TOKEN-HERE/, "Control walkthrough must not depend on fragile clipboard/manual token handoff");
assert.doesNotMatch(controlDoc, /RandomNumberGenerator\]::(?:Create|GetBytes)/, "Control docs must not depend on PowerShell/.NET RNG API differences");
assert.match(controlDoc, /one mutable operation at a time/i, "Control documentation must explain the operation lock");
assert.match(controlDoc, /hgr-control-audit\.ndjson/, "Control documentation must identify the local audit trail");
assert.match(docsIndex, /HGR_MASTERBOOK\.md/, "Documentation index must expose the Masterbook");
assert.match(docsIndex, /HGR_MOBILE_CONTROL\.md/, "Documentation index must expose HGR Mobile Control");
assert.match(projectReadme, /docs\/HGR_MASTERBOOK\.md/, "Root README must link the Masterbook");
assert.match(controlStartHelper, /randomBytes\(32\)\.toString\('base64'\)/, "Local Control launcher helper must generate a cryptographic token with Node");
assert.match(controlStartHelper, /server\\data\\runtime/, "Local Control launcher helper must store transient state only in ignored runtime data");
assert.match(controlStartHelper, /Remove-Item -LiteralPath \$tokenPath -Force/, "Local Control launcher helper must remove the temporary token when it exits");
assert.doesNotMatch(controlStartHelper, /Write-Host\s+\$token|Write-Output\s+\$token/, "Local Control launcher must not print the bearer token");
assert.match(controlClientHelper, /ValidateSet\("status", "restart", "logs"\)/, "Local Control client must expose only the approved development actions");
assert.match(controlClientHelper, /"restart"[\s\S]*?\/api\/actions\/restart/s, "Local Control restart helper must target only the fixed restart endpoint");
assert.doesNotMatch(controlClientHelper, /Invoke-Expression|Start-Process|cmd\.exe|powershell\.exe/i, "Local Control client must not become a general process runner");
assert.match(controlLauncher, /start-control-agent\.ps1/i, "Stable HGR Control CMD entrypoint must delegate to the fixed PowerShell helper");
assert.match(controlLauncherAlias, /call "%~dp0Start HGR Control\.cmd"/i, "PowerShell-safe HGR Control alias must delegate to the canonical spaced launcher");
assert.match(controlClientEntry, /hgr-control-client\.ps1/i, "Stable HGR Control client entrypoint must delegate to the allow-listed PowerShell client");
assert.match(controlStartHelper, /HGR-Control\.cmd' status/, "Running agent must print an absolute status client command");
assert.match(controlStartHelper, /HGR-Control\.cmd' restart/, "Running agent must print an absolute restart client command");
assert.match(controlStartHelper, /HGR-Control\.cmd' logs/, "Running agent must print an absolute logs client command");
assert.match(controlDoc, /\.\\Start-HGR-Control\.cmd/, "PowerShell walkthrough must use the no-space launcher alias");
assert.match(controlDoc, /\.\\HGR-Control\.cmd status/, "PowerShell walkthrough must use the stable root Control client");
assert.match(gitignore, /server\/data\/runtime\//, "Temporary HGR Control token and audit files must remain ignored by Git");
assert.match(controlStartBridge, /Join-Path \$projectRoot "Start Halieus Game Room\.cmd"/, "Windows start bridge must resolve only the canonical start launcher");
assert.match(controlStartBridge, /& \$startLauncher/, "Windows start bridge must invoke the fixed launcher path directly");
assert.doesNotMatch(controlStartBridge, /param\([\s\S]*?Command|Invoke-Expression|Start-Process/i, "Windows start bridge must not accept or evaluate arbitrary commands");
assert.match(controlRestartBridge, /Join-Path \$projectRoot "Restart Halieus Game Room\.cmd"/, "Windows restart bridge must resolve only the canonical restart launcher");
assert.match(controlRestartBridge, /& \$restartLauncher/, "Windows restart bridge must invoke the fixed launcher path directly");
assert.doesNotMatch(controlRestartBridge, /param\([\s\S]*?Command|Invoke-Expression|Start-Process/i, "Windows restart bridge must not accept or evaluate arbitrary commands");
assert.match(controlCloseBridge, /Join-Path \$projectRoot "Close Halieus Game Room\.cmd"/, "Windows close bridge must resolve only the canonical close launcher");
assert.match(controlCloseBridge, /& \$closeLauncher/, "Windows close bridge must invoke the fixed launcher path directly");
assert.doesNotMatch(controlCloseBridge, /param\([\s\S]*?Command|Invoke-Expression|Start-Process/i, "Windows close bridge must not accept or evaluate arbitrary commands");
assert.match(controlUpdateBridge, /Join-Path \$projectRoot "Update HGR GitHub\.cmd"/, "Windows update bridge must resolve only the canonical updater");
assert.match(controlUpdateBridge, /HGR_UPDATE_NONINTERACTIVE = "1"/, "Control update bridge must force non-interactive updater mode");
assert.match(updateLauncher, /Remote\/non-interactive Update found local source changes/, "Non-interactive updater must refuse to stage unexpected owner edits");
assert.match(updateLauncher, /if \/i "%HGR_UPDATE_NONINTERACTIVE%"=="1"/, "Updater must bypass pause prompts in Control mode");
assert.match(agent, /blockingRemoteUpdateChanges/, "Remote Update must preflight tracked source changes before running");
assert.match(agent, /UPDATE_PROGRESS_MARKERS/, "Remote Update must expose structured stage progress");
assert.match(agent, /FINAL STEP - Refreshing the HGR client/, "Control progress must follow the release-aware final client refresh step");
assert.match(agent, /timeout: 45 \* 60 \* 1000/, "Remote Update must use a bounded long-running timeout");

assert.match(agent, /HGR_CONTROL_PAIR_CODE/, "Mobile pairing must use a separate short-lived pairing secret");
assert.match(agent, /request\.method === "POST" && request\.url === "\/api\/pair"/, "Control agent must expose the fixed mobile pairing endpoint");
assert.match(agent, /PAIR_FAILURE_LIMIT = 5/, "Mobile pairing must throttle repeated incorrect codes");
assert.match(agent, /PAIR_BLOCK_MS = 60 \* 1000/, "Pairing throttling must impose a cooldown");
assert.match(agent, /HttpOnly/, "Mobile Control sessions must use HttpOnly cookies");
assert.match(agent, /Secure/, "Mobile Control session cookies must be Secure");
assert.match(agent, /SameSite=Strict/, "Mobile Control session cookies must be SameSite=Strict");
assert.match(agent, /controlUiDirectory/, "Control Agent must serve the dedicated mobile control UI");
assert.doesNotMatch(agent, /Access-Control-Allow-Origin[^\n]*\*/, "Control Agent must not enable wildcard CORS for the owner control API");
assert.match(controlMobileHelper, /HGR_CONTROL_HOST = "127\.0\.0\.1"/, "Mobile launcher must keep the Control Agent on loopback");
assert.match(controlMobileHelper, /serve --bg "--https=\$HttpsPort" \$target/, "Mobile launcher must expose loopback through Tailscale Serve HTTPS");
assert.match(controlMobileHelper, /\[int\]\$HttpsPort = 8443/, "Mobile Control must use a dedicated HTTPS port by default");
assert.match(controlMobileHelper, /HGR_CONTROL_PAIR_EXPIRES_AT/, "Mobile launcher must provide a pairing expiry");
assert.match(controlMobileHelper, /AddMinutes\(10\)/, "Mobile pairing code must be short lived");
assert.doesNotMatch(controlMobileHelper, /Write-Host\s+"?\$token\b/i, "Mobile launcher must never print the bearer token");
assert.match(controlMobileHelper, /serve "--https=\$HttpsPort" off/, "Mobile launcher must remove its Tailscale Serve route on exit");
assert.match(controlMobileLauncher, /start-control-mobile\.ps1/i, "Stable mobile launcher must delegate to the fixed PowerShell helper");
assert.match(controlMobileLauncherAlias, /call "%~dp0Start HGR Control Mobile\.cmd"/i, "PowerShell-safe mobile alias must delegate to the canonical launcher");
assert.match(controlUiHtml, /manifest\.webmanifest/, "Mobile Control must be installable as a PWA");
assert.match(controlUiHtml, /id="pairCode"/, "Mobile Control must provide an explicit device pairing surface");
assert.match(controlUiHtml, /id="introSplash"/, "Mobile Control must provide the requested intro/connection surface");
assert.match(controlUiHtml, /id="startButton"/, "Mobile Control must expose Start");
assert.match(controlUiHtml, /id="closeButton"/, "Mobile Control must expose Close");
assert.match(controlUiHtml, /id="updateButton"/, "Mobile Control must expose Update");
assert.match(controlUiHtml, /id="operationPanel"/, "Mobile Control must expose live operation progress");
assert.match(controlUiHtml, /id="confirmDialog"/, "Mobile Control must provide confirmation UX for destructive/expensive actions");
assert.match(controlUiJs, /credentials:\s*"include"/, "Mobile PWA API calls must use the HttpOnly session cookie");
assert.match(controlUiJs, /\/api\/confirm/, "Mobile PWA must request server-side one-time confirmations");
assert.match(controlUiJs, /\/api\/actions\/\$\{action\}/, "Mobile PWA must call only fixed action routes");
assert.match(controlUiJs, /queueOperationPoll/, "Mobile PWA must poll active Update progress without holding one HTTP request open");
assert.match(controlUiJs, /finishIntro\("Secure link ready"\)/, "Mobile PWA intro must resolve into the authenticated state");
assert.match(controlUiJs, /classList\.toggle\("is-close", action === "close"\)/, "Close confirmation must inherit Close action colour");
assert.match(controlUiJs, /classList\.toggle\("is-update", action === "update"\)/, "Update confirmation must inherit Update action colour");
assert.doesNotMatch(controlUiJs, /localStorage|sessionStorage/, "Mobile Control must not persist control credentials in browser storage");
assert.match(controlManifest, /"display": "standalone"/, "Mobile Control manifest must support standalone installation");
assert.match(controlServiceWorker, /url\.pathname\.startsWith\("\/api\/"\)/, "Control service worker must never cache API traffic");
assert.match(launcherIconGenerator, /Start Halieus Game Room'[\s\S]*?#258B58/, "Launcher family must retain Start green");
assert.match(launcherIconGenerator, /Restart Halieus Game Room'[\s\S]*?#B97818/, "Launcher family must retain Restart amber");
assert.match(launcherIconGenerator, /Close Halieus Game Room'[\s\S]*?#BD4545/, "Launcher family must retain Close red");
assert.match(launcherIconGenerator, /Update Halieus Website'[\s\S]*?#3475C5/, "Launcher family must retain Update blue");
assert.match(controlCss, /--start: #258B58/, "Control UI must reuse the established Start green");
assert.match(controlCss, /--restart: #B97818/, "Control UI must reuse the established Restart amber");
assert.match(controlCss, /--close: #BD4545/, "Control UI must reuse the established Close red");
assert.match(controlCss, /--update: #3475C5/, "Control UI must reuse the established Update blue");
assert.match(controlCss, /--control: #7667d8/, "HGR Control must have a distinct non-action violet identity");
assert.match(controlCss, /progressSheen/, "Update progress must visibly animate while the percentage is unchanged");
assert.match(controlDoc, /Tailscale Serve/, "Control documentation must record the private HTTPS proxy design");
assert.match(controlDoc, /HttpOnly; Secure; SameSite=Strict/, "Control documentation must record the mobile session boundary");
assert.match(masterbook, /real-device verified for pairing, status, logs, session persistence\/invalidation and Restart/i, "Masterbook must record the completed real-device mobile security QA milestone");

assert.match(maintenanceContract, /HalieusMaintenanceNotice/, "Shared platform must define the maintenance-notice contract");
assert.match(maintenanceContract, /releaseFingerprint: string/, "Server-ready contract must expose exact release identity");
assert.match(serverIndex, /app\.post\("\/internal\/maintenance"/, "Production server must expose the internal maintenance hook");
assert.match(serverIndex, /isLoopbackRequest\(request\)/, "Maintenance control must remain loopback-only");
assert.match(serverIndex, /io\.emit\("platform:maintenance"/, "Production server must broadcast maintenance state to connected players");
assert.match(serverIndex, /releaseFingerprint: RELEASE_FINGERPRINT/, "Server reconnect must publish the exact active release fingerprint");
assert.match(serverIndex, /socket\.emit\("platform:maintenance", activeMaintenanceNotice\)/, "Players connecting during the warning must receive current maintenance state");
assert.match(oracleQuickInstall, /Connected players notified of the incoming HGR restart/, "Oracle activation must notify players before stopping production");
assert.match(oracleQuickInstall, /sleep "\$MAINTENANCE_GRACE_SECONDS"[\s\S]*?systemctl stop halieus-game-room/s, "Oracle activation must provide a grace window before service stop");
assert.match(maintenanceBanner, /socket\.on\("platform:maintenance"/, "Website must render server maintenance events");
assert.match(maintenanceBanner, /ready\.releaseFingerprint !== RELEASE_FINGERPRINT/, "Website must compare reconnect release identity with its loaded bundle");
assert.match(maintenanceBanner, /window\.location\.reload\(\)/, "An existing website tab must refresh itself when a new release reconnects");
assert.match(maintenanceBanner, /recovery key or room code/i, "Maintenance warning must remind live players about recovery information");
assert.match(clientMain, /<PlatformMaintenanceBanner \/>/, "Maintenance UI must be mounted across the whole website");
assert.match(maintenanceBannerCss, /z-index: 10000/, "Maintenance warning must stay above game surfaces");
assert.match(postUpdateClient, /release-aware-refresh\.enabled/, "Post-update helper must persist the one-time release-aware capability marker");
assert.match(postUpdateClient, /Existing release-aware HGR app window detected/, "Post-update helper must preserve an already-open release-aware HGR window");
assert.match(postUpdateClient, /Existing HGR window predates release-aware refresh/, "Pre-feature clients must receive one bootstrap restart");
assert.match(postUpdateClient, /Restart Halieus Game Room\.cmd/, "One-time bootstrap may use the canonical hard Restart fallback");
assert.match(postUpdateClient, /Start Halieus Game Room\.cmd/, "Post-update helper may open HGR when no dedicated window is running");
assert.match(updateLauncher, /FINAL STEP - Refreshing the HGR client/, "Updater must use release-aware client refresh as its final local step");

for (const releasePath of [
  "server/control-ui",
  "Start HGR Control Mobile.cmd",
  "Start-HGR-Control-Mobile.cmd",
  "scripts/windows/start-control-mobile.ps1",
  "scripts/windows/control-start.ps1",
  "scripts/windows/control-restart.ps1",
  "scripts/windows/control-close.ps1",
  "scripts/windows/control-update.ps1",
  "scripts/windows/post-update-client.ps1",
]) {
  assert.ok(
    releaseIntegrity.includes(releasePath),
    `HGR Mobile Control release identity must include ${releasePath}`,
  );
}
for (const rootLauncher of [
  "HGR-Control.cmd",
  "Start HGR Control.cmd",
  "Start-HGR-Control.cmd",
  "Start HGR Control Mobile.cmd",
  "Start-HGR-Control-Mobile.cmd",
]) {
  assert.ok(
    oraclePacker.includes(`"${rootLauncher}"`),
    `Oracle packer must include release-signed root launcher ${rootLauncher}`,
  );
  assert.ok(
    oraclePackageRegression.includes(rootLauncher),
    `Oracle package regression must verify ${rootLauncher}`,
  );
}
for (const packagedControlFile of [
  "scripts/windows/start-control-mobile.ps1",
  "scripts/windows/control-start.ps1",
  "scripts/windows/control-restart.ps1",
  "scripts/windows/control-close.ps1",
  "scripts/windows/control-update.ps1",
  "scripts/windows/post-update-client.ps1",
  "server/control-ui/index.html",
  "server/control-ui/control.css",
  "server/control-ui/control.js",
  "server/control-ui/manifest.webmanifest",
  "server/control-ui/sw.js",
]) {
  assert.ok(
    oraclePackageRegression.includes(packagedControlFile),
    `Oracle package regression must verify ${packagedControlFile}`,
  );
}
assert.match(
  releaseIntegrity,
  /hgr-control-private-mobile-pwa-4\.5\.3/,
  "Release feature inventory must record the private mobile Control PWA",
);
assert.match(
  releaseIntegrity,
  /hgr-control-start-close-update-4\.5\.3/,
  "Release feature inventory must record the expanded Control action set",
);
assert.match(
  releaseIntegrity,
  /hgr-control-confirmed-update-progress-4\.5\.3/,
  "Release feature inventory must record confirmed Update progress",
);
assert.match(
  releaseIntegrity,
  /hgr-control-distinct-action-palette-4\.5\.3/,
  "Release feature inventory must record the Control/action colour split",
);
assert.match(
  releaseIntegrity,
  /hgr-maintenance-release-aware-refresh-4\.5\.3/,
  "Release feature inventory must record player maintenance and in-place release refresh",
);

console.log("HGR Control foundation / mobile PWA / Masterbook regression: PASS");
