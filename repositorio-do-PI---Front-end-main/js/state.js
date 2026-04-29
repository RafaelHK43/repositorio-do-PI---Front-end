import { STORAGE_KEYS } from "./config.js";

export function getUser() {
  const raw = localStorage.getItem(STORAGE_KEYS.user);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    clearUser();
    return null;
  }
}

export function setUser(user) {
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
}

export function clearUser() {
  localStorage.removeItem(STORAGE_KEYS.user);
}

export function getPage() {
  return localStorage.getItem(STORAGE_KEYS.page) || "login";
}

export function setPage(page) {
  localStorage.setItem(STORAGE_KEYS.page, page);
}

export function getAuthHeader() {
  return getUser()?.authHeader || "";
}
