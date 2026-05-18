/**
 * Couche d'abstraction pour la persistance — désormais branchée sur Supabase.
 *
 * L'API publique (`storageGet`, `storageSet`, `storageDelete`, `todayKey`) reste
 * identique à la version localStorage : c'est elle qui fait le pont entre les
 * clés historiques utilisées par App.jsx et les trois tables côté Postgres.
 *
 * Clés supportées :
 *   - 'warehouse:layout' → table `warehouse_layout` (row id='main')
 *   - 'products:list'    → table `products` (lecture limitée aux produits actifs)
 *   - 'stats:daily'      → table `daily_stats`
 *
 * Conversion de noms : Supabase utilise snake_case (location_code, last_picking),
 * l'app utilise camelCase (locationCode, lastPicking). On mappe dans les deux sens.
 */

import { supabase, isConfigured } from './supabase.js';

export { isConfigured };

const PAGE_SIZE = 1000;   // limite serveur Supabase par requête par défaut
const UPSERT_BATCH = 500; // taille de batch pour les upserts massifs (import 10k+)

// ─── Helpers de mapping produit ─────────────────────────────────────────────

/**
 * Convertit un produit côté app (camelCase) en row prêt à insérer (snake_case).
 * Les champs `undefined` sont omis pour ne pas écraser une valeur existante
 * (utile lors d'un upsert partiel : on ne touche qu'aux colonnes fournies).
 */
function productToRow(p) {
  const row = {};
  if (p.id !== undefined) row.id = p.id;
  if (p.sku !== undefined) row.sku = p.sku;
  if (p.name !== undefined) row.name = p.name;
  if (p.ean !== undefined) row.ean = p.ean || null;
  if (p.locationCode !== undefined) row.location_code = p.locationCode || null;
  if (p.pareto !== undefined) row.pareto = p.pareto || null;
  if (p.rank !== undefined) row.rank = p.rank;
  if (p.rotation !== undefined) row.rotation = p.rotation;
  if (p.stock !== undefined) row.stock = p.stock;
  if (p.weight !== undefined) row.weight = p.weight;
  if (p.lastPicking !== undefined) {
    // Supabase / Postgres TIMESTAMPTZ accepte un ISO string ; tolère aussi
    // null pour vider la valeur. Si la chaîne est invalide on préfère null.
    if (!p.lastPicking) row.last_picking = null;
    else {
      const d = new Date(p.lastPicking);
      row.last_picking = isNaN(d.getTime()) ? null : d.toISOString();
    }
  }
  if (p.active !== undefined) row.active = p.active;
  if (p.x !== undefined) row.x = p.x;
  if (p.y !== undefined) row.y = p.y;
  return row;
}

/**
 * Convertit une row Supabase en produit côté app (camelCase).
 */
function rowToProduct(r) {
  return {
    id: r.id,
    sku: r.sku,
    name: r.name,
    ean: r.ean,
    locationCode: r.location_code,
    pareto: r.pareto,
    rank: r.rank,
    rotation: r.rotation == null ? 0 : Number(r.rotation),
    stock: r.stock == null ? 0 : Number(r.stock),
    weight: r.weight == null ? null : Number(r.weight),
    lastPicking: r.last_picking,
    active: r.active,
    x: r.x,
    y: r.y,
  };
}

// ─── Accès Layout ───────────────────────────────────────────────────────────

async function getLayout() {
  const { data, error } = await supabase
    .from('warehouse_layout')
    .select('*')
    .eq('id', 'main')
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { w: data.width, h: data.height, cells: data.cells };
}

async function setLayout(layout) {
  if (!layout) return;
  const { error } = await supabase
    .from('warehouse_layout')
    .upsert({
      id: 'main',
      width: layout.w,
      height: layout.h,
      cells: layout.cells,
    }, { onConflict: 'id' });
  if (error) throw error;
}

// ─── Accès Produits ─────────────────────────────────────────────────────────

/**
 * Récupère tous les produits actifs. Paginé côté client car Supabase plafonne
 * à 1000 lignes par requête par défaut (PostgREST `max-rows`), et on peut
 * dépasser 10 000 produits.
 */
async function getProducts() {
  const out = [];
  let from = 0;
  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .order('id', { ascending: true })
      .range(from, to);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const r of data) out.push(rowToProduct(r));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return out;
}

/**
 * Persiste la liste des produits par upsert en batch de 500.
 *
 * NB : on ne fait pas de DELETE global (risqué). Conséquence : si on retire
 * un produit du tableau côté UI, il reste en DB et reviendra au prochain GET.
 * Pour "supprimer" il faut mettre `active = false` (filtré au GET) ou ajouter
 * une fonction `deleteProductById` dédiée plus tard.
 */
async function setProducts(products) {
  if (!Array.isArray(products) || products.length === 0) return;
  for (let i = 0; i < products.length; i += UPSERT_BATCH) {
    const batch = products.slice(i, i + UPSERT_BATCH).map(productToRow);
    const { error } = await supabase
      .from('products')
      .upsert(batch, { onConflict: 'id' });
    if (error) throw error;
  }
}

// ─── Accès Stats ────────────────────────────────────────────────────────────

async function getStats() {
  const { data, error } = await supabase
    .from('daily_stats')
    .select('*');
  if (error) throw error;
  const out = {};
  for (const row of data || []) {
    out[row.date] = {
      picked: row.picked ?? 0,
      packed: row.packed ?? 0,
      orders: row.orders ?? 0,
      errors: row.errors ?? 0,
      hours: row.hours == null ? 0 : Number(row.hours),
    };
  }
  return out;
}

async function setStats(stats) {
  if (!stats || typeof stats !== 'object') return;
  const rows = Object.entries(stats).map(([date, s]) => ({
    date,
    picked: s.picked ?? 0,
    packed: s.packed ?? 0,
    orders: s.orders ?? 0,
    errors: s.errors ?? 0,
    hours: s.hours ?? 0,
  }));
  if (!rows.length) return;
  const { error } = await supabase
    .from('daily_stats')
    .upsert(rows, { onConflict: 'date' });
  if (error) throw error;
}

// ─── API publique inchangée ─────────────────────────────────────────────────

export async function storageGet(key, fallback = null) {
  if (!isConfigured) return fallback;
  try {
    if (key === 'warehouse:layout') return (await getLayout()) ?? fallback;
    if (key === 'products:list')    return await getProducts();
    if (key === 'stats:daily')      return await getStats();
    return fallback;
  } catch (e) {
    console.error(`storageGet(${key}) error:`, e);
    return fallback;
  }
}

export async function storageSet(key, value) {
  if (!isConfigured) return false;
  try {
    if (key === 'warehouse:layout') await setLayout(value);
    else if (key === 'products:list') await setProducts(value);
    else if (key === 'stats:daily')   await setStats(value);
    else return false;
    return true;
  } catch (e) {
    console.error(`storageSet(${key}) error:`, e);
    return false;
  }
}

export async function storageDelete(key) {
  if (!isConfigured) return false;
  try {
    if (key === 'warehouse:layout') {
      const { error } = await supabase
        .from('warehouse_layout').delete().eq('id', 'main');
      if (error) throw error;
      return true;
    }
    // Pour 'products:list' et 'stats:daily' on ne supporte pas le delete global.
    return false;
  } catch (e) {
    console.error(`storageDelete(${key}) error:`, e);
    return false;
  }
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}
