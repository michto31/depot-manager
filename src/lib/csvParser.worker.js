/**
 * Web Worker pour le parsing CSV.
 *
 * Pourquoi un worker : sur un export Iziship de ~11 000 lignes, parser le CSV
 * sur le thread principal gèle l'UI plusieurs secondes. Ce worker fait
 * exactement le même travail (même machine à états que la version inline
 * historique d'ImportView), mais hors du thread UI, et envoie périodiquement
 * une progression au composant.
 *
 * Protocole :
 *   - in  : { text: string }
 *   - out : { type: 'progress', pct: number }   (régulier, pendant le parsing)
 *   - out : { type: 'done', result: { headers, rows, sep } }
 *   - out : { type: 'error', message: string }
 */

// Émet une progression au plus tous les PROGRESS_STEP caractères pour ne pas
// noyer le main thread sous les postMessage (chaque message a un coût de copie).
const PROGRESS_STEP = 5000;

function parseCSV(text) {
  if (!text || !text.trim()) return null;

  // 1) Détection du séparateur sur la première ligne, hors guillemets.
  //    Le ';' l'emporte s'il apparaît plus souvent que ',' — typique d'Iziship.
  let sep = ',';
  {
    let inQ = false;
    let semis = 0;
    let commas = 0;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') inQ = !inQ;
      else if (c === '\n' && !inQ) break;
      else if (!inQ) {
        if (c === ';') semis++;
        else if (c === ',') commas++;
      }
    }
    if (semis > commas) sep = ';';
  }

  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  const total = text.length;
  let nextProgressAt = PROGRESS_STEP;

  for (let i = 0; i < total; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else { inQuotes = false; }
      } else {
        cell += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === sep) {
        row.push(cell); cell = '';
      } else if (c === '\n') {
        row.push(cell); cell = '';
        rows.push(row); row = [];
      } else if (c === '\r') {
        // ignore CR (géré avec LF)
      } else {
        cell += c;
      }
    }

    if (i >= nextProgressAt) {
      // Math.floor pour ne jamais émettre 100 avant la fin réelle.
      const pct = Math.floor((i / total) * 100);
      self.postMessage({ type: 'progress', pct });
      nextProgressAt += PROGRESS_STEP;
    }
  }

  // Dernière cellule / ligne éventuelle (fichier sans \n final).
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  if (!rows.length) return null;
  const headers = rows[0].map((h) => h.trim());
  const dataRows = rows.slice(1).filter((r) => r.some((c) => c && c.trim() !== ''));
  return { headers, rows: dataRows, sep };
}

self.onmessage = (e) => {
  const { text } = e.data || {};
  try {
    const result = parseCSV(text);
    // Une progression finale à 100% pour que l'overlay ne reste pas à 99%.
    self.postMessage({ type: 'progress', pct: 100 });
    self.postMessage({ type: 'done', result });
  } catch (err) {
    self.postMessage({ type: 'error', message: err && err.message ? err.message : 'Erreur de parsing CSV' });
  }
};
