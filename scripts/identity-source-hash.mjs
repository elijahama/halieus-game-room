import { createHash } from "node:crypto";

/** Hash SVG identity source independent of Git checkout line endings.
 * Do not normalise actual artwork, raster hashes, or role-specific assets.
 */
export function identitySourceSha256(svg) {
  const text = Buffer.isBuffer(svg) ? svg.toString("utf8") : svg;
  return createHash("sha256").update(text.replace(/\r\n?/g, "\n"), "utf8").digest("hex");
}
