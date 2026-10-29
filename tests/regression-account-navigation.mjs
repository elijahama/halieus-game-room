import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const panel=read("client/src/platform/accounts/AccountPanel.tsx"),style=read("client/src/styles/hgr-account-workspace.css"),entry=read("client/src/main.tsx");
assert.match(panel,/type PersonalView = "profile" \| "appearance" \| "notifications" \| "record" \| "feedback"/);
assert.match(panel,/aria-label="Personal account sections"/);
assert.match(panel,/role="tablist"/);
assert.match(panel,/aria-selected=\{personalView === id\}/);
assert.match(panel,/\{personalView === "profile" && <div className="account-profile-grid">/);
assert.match(panel,/\{personalView === "notifications" && <section/);
assert.match(panel,/\{personalView === "record" && personalStats && <section/);
assert.match(panel,/\{personalView === "feedback" && <section/);
assert.match(panel,/\{isAdmin && <nav className="hgr-account-workspace-switch"/,
  "Owner control must only render for authorized admin/owner accounts");
assert.match(panel,/setAdminTab\("account"\)/);
assert.match(panel,/setAdminTab\("overview"\)/);
assert.match(panel,/aria-label="Owner control panel sections"/);
assert.match(panel,/account-close-all-rooms/,"Dangerous emergency owner action retained");
assert.match(style,/overflow-y: auto !important/,"Single vertical scroll owner");
assert.match(style,/overflow-x: auto !important/,"Compact swipeable owner navigation");
assert.match(style,/@media \(max-width: 760px\)/,"Portrait-specific layout");
assert.match(style,/focus-visible/,"Keyboard focus retained");
assert(entry.lastIndexOf("hgr-account-workspace.css") > entry.lastIndexOf("hgr-flat-mobile-join.css"),
  "New account layout must load after legacy/Join stylesheet");
console.log("PASS owner profile navigation accessibility, scoped account sections and responsive layout wiring");
