const PREFIX = "carried:id:";
const NAME_KEY = "carried:name";

export function getIdentity(code) {
  if (typeof window === "undefined" || !code) return null;
  try {
    const raw = window.localStorage.getItem(PREFIX + String(code).toUpperCase());
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.token ? parsed : null;
  } catch {
    return null;
  }
}

export function saveIdentity(code, identity) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFIX + String(code).toUpperCase(), JSON.stringify(identity));
  } catch {
    /* storage may be unavailable */
  }
}

export function clearIdentity(code) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PREFIX + String(code).toUpperCase());
  } catch {
    /* ignore */
  }
}

export function getRememberedName() {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(NAME_KEY) || "";
  } catch {
    return "";
  }
}

export function rememberName(name) {
  if (typeof window === "undefined" || !name) return;
  try {
    window.localStorage.setItem(NAME_KEY, name);
  } catch {
    /* ignore */
  }
}
