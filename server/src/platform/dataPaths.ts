import { resolve } from "node:path";

// Oracle production sets HALIEUS_DATA_DIR to a durable location outside the
// deployed source tree. Local development keeps the legacy paths unless the
// operator explicitly opts into the canonical root, avoiding surprise data loss.
function configuredDataRoot(): string | null {
  const value = process.env.HALIEUS_DATA_DIR?.trim();
  return value ? resolve(value) : null;
}

export function getHalieusDataRoot(): string | null {
  return configuredDataRoot();
}

export function getAccountDataDirectory(): string {
  const accountOverride = process.env.HALIEUS_ACCOUNT_DATA_DIR?.trim();
  if (accountOverride) return resolve(accountOverride);
  const root = configuredDataRoot();
  return root ? resolve(root, "accounts") : resolve(process.cwd(), "data", "accounts");
}

export function getSessionDataDirectory(): string {
  const root = configuredDataRoot();
  return root ? resolve(root, "sessions") : resolve(process.cwd(), "data", "sessions");
}

export function getFeedbackFilePath(): string {
  const root = configuredDataRoot();
  return root ? resolve(root, "feedback", "feedback.ndjson") : resolve(process.cwd(), "data", "feedback.ndjson");
}

export function getMegaBoardDataDirectory(): string {
  const megaOverride = process.env.MEGA_MONOPOLY_DATA_DIR?.trim();
  if (megaOverride) return resolve(megaOverride);
  const root = configuredDataRoot();
  return root ? resolve(root, "mega-board") : resolve(process.cwd(), "data");
}
