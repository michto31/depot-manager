/**
 * Couche d'abstraction pour la persistance.
 * Actuellement basée sur localStorage. Pour brancher une vraie API (Supabase, REST...),
 * il suffit de modifier ces fonctions sans toucher au reste du code.
 */

const PREFIX = 'depot-manager:';

export async function storageGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.error('storageGet error:', e);
    return fallback;
  }
}

export async function storageSet(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error('storageSet error:', e);
    return false;
  }
}

export async function storageDelete(key) {
  try {
    localStorage.removeItem(PREFIX + key);
    return true;
  } catch (e) {
    console.error('storageDelete error:', e);
    return false;
  }
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}
