import { ABC_THRESHOLDS } from './constants.js';

/**
 * Distance Manhattan d'une cellule à la cellule PREP la plus proche.
 */
export function distanceToPrep(cells, w, h, x, y) {
  let min = Infinity;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      if (cells[j * w + i] === 'PREP') {
        const d = Math.abs(i - x) + Math.abs(j - y);
        if (d < min) min = d;
      }
    }
  }
  return min === Infinity ? null : min;
}

/**
 * Classification ABC d'un produit selon sa rotation (picks/sem).
 */
export function rotationClass(rotation) {
  const r = Number(rotation || 0);
  if (r >= ABC_THRESHOLDS.A) return { bg: '#7f1d1d', color: '#fecaca', label: 'A' };
  if (r >= ABC_THRESHOLDS.B) return { bg: '#7c2d12', color: '#fed7aa', label: 'B' };
  if (r >= ABC_THRESHOLDS.C) return { bg: '#3f3f46', color: '#e4e4e7', label: 'C' };
  return { bg: '#18181b', color: '#71717a', label: 'D' };
}

/**
 * Classification d'un produit à partir du champ Pareto fourni par le WMS.
 * Accepte les formats "A (80%)", "B (15%)", "C (5%)", "A", "b", etc.
 * Retourne null si le champ est vide ou non reconnu.
 */
export function paretoClass(pareto) {
  if (!pareto) return null;
  const letter = String(pareto).trim().charAt(0).toUpperCase();
  if (letter === 'A') return { bg: '#7f1d1d', color: '#fecaca', label: 'A' };
  if (letter === 'B') return { bg: '#7c2d12', color: '#fed7aa', label: 'B' };
  if (letter === 'C') return { bg: '#3f3f46', color: '#e4e4e7', label: 'C' };
  if (letter === 'D') return { bg: '#18181b', color: '#71717a', label: 'D' };
  return null;
}

/**
 * Classification d'un produit : on privilégie la valeur Pareto fournie par le WMS
 * (déjà calculée à l'échelle de l'entreprise) plutôt que de la recalculer
 * à partir de la rotation locale.
 */
export function productClass(product) {
  return paretoClass(product?.pareto) || rotationClass(product?.rotation);
}

/**
 * Calcule le score global d'optimisation du dépôt.
 * Plus un produit a une forte rotation et est éloigné du PREP, plus il pénalise le score.
 */
export function computeOptimizationScore(products, layout) {
  if (!layout || !products.length) {
    return { score: 0, misplaced: [], total: 0, avgDist: '0' };
  }

  const { cells, w, h } = layout;
  let totalRotation = 0;
  let weighted = 0;
  const misplaced = [];

  for (const p of products) {
    if (p.x == null || p.y == null) continue;
    const d = distanceToPrep(cells, w, h, p.x, p.y);
    if (d === null) continue;

    const rotation = Number(p.rotation || 0);
    weighted += rotation * d;
    totalRotation += rotation;

    if (rotation > 30 && d > 5) {
      misplaced.push({ ...p, distance: d });
    }
  }

  const avgWeightedDist = totalRotation > 0 ? weighted / totalRotation : 0;
  const maxDist = w + h;
  const score = Math.max(0, Math.round(100 * (1 - avgWeightedDist / maxDist)));

  return {
    score,
    misplaced: misplaced.sort((a, b) => b.rotation - a.rotation),
    avgDist: avgWeightedDist.toFixed(2),
  };
}
