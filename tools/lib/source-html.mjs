import { createHash } from "node:crypto";

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function readWindowAssignment(html, name) {
  const marker = `window.${name}=`;
  const markerAt = html.indexOf(marker);
  if (markerAt < 0) throw new Error(`Missing ${name} in source HTML`);
  const start = markerAt + marker.length;

  if (html[start] === '"') {
    let escaped = false;
    for (let i = start + 1; i < html.length; i += 1) {
      const char = html[i];
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') return JSON.parse(html.slice(start, i + 1));
    }
    throw new Error(`Unterminated string assignment for ${name}`);
  }

  let quoted = false;
  let escaped = false;
  let depth = 0;
  for (let i = start; i < html.length; i += 1) {
    const char = html[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === "{" || char === "[") depth += 1;
    else if (char === "}" || char === "]") {
      depth -= 1;
      if (depth === 0) return JSON.parse(html.slice(start, i + 1));
    }
  }
  throw new Error(`Unterminated assignment for ${name}`);
}

export function safeRelativeKey(key) {
  if (!/^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/.test(key)) {
    throw new Error(`Unsafe work key: ${key}`);
  }
  return key;
}
