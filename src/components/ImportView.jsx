import React, { useState, useRef } from 'react';

/**
 * Parser CSV robuste : gère les valeurs entre guillemets, les guillemets échappés ("")
 * et les retours à la ligne à l'intérieur des cellules.
 * Le séparateur est détecté automatiquement (priorité au ';' s'il apparaît
 * plus souvent que ',' sur la première ligne hors guillemets).
 */
function parseCSV(text) {
  if (!text || !text.trim()) return null;

  // Détection du séparateur sur la première ligne, hors guillemets
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

  for (let i = 0; i < text.length; i++) {
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
        // ignore CR (handled with LF)
      } else {
        cell += c;
      }
    }
  }
  // Dernière cellule / ligne éventuelle
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  if (!rows.length) return null;
  const headers = rows[0].map((h) => h.trim());
  const dataRows = rows.slice(1).filter((r) => r.some((c) => c && c.trim() !== ''));
  return { headers, rows: dataRows, sep };
}

/**
 * Format Iziship : reconnu à la présence simultanée des colonnes "Code site" et "Pareto".
 */
function detectFormat(headers) {
  if (!headers) return 'simple';
  const lower = headers.map((h) => h.toLowerCase());
  const hasCodeSite = lower.some((h) => h === 'code site');
  const hasPareto = lower.some((h) => h === 'pareto');
  return hasCodeSite && hasPareto ? 'iziship' : 'simple';
}

/**
 * Trouve l'index d'une colonne par son nom (insensible à la casse, tolère les espaces).
 */
function colIdx(headers, name) {
  const target = name.toLowerCase().trim();
  return headers.findIndex((h) => h.toLowerCase().trim() === target);
}

/**
 * Parse un booléen "Actif?" tel que renvoyé par Iziship.
 */
function parseBool(v) {
  if (v == null) return true;
  const s = String(v).trim().toLowerCase();
  if (['false', '0', 'non', 'no', 'faux', ''].includes(s)) return false;
  return true;
}

function parseNum(v) {
  if (v == null || v === '') return null;
  // Iziship peut envoyer des nombres avec virgule décimale
  const s = String(v).replace(',', '.').trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Identifiant local unique pour fallback. Date.now()+index seul peut entrer en collision
 * lors d'imports successifs (même ms) ; on ajoute un suffixe aléatoire.
 */
function genLocalId(prefix, i) {
  return `${prefix}-${Date.now().toString(36)}-${i}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Convertit une ligne Iziship en objet produit côté app.
 * Les coordonnées X/Y sont laissées indéfinies — elles seront associées
 * plus tard via un mapping séparé location_code → (x,y).
 */
function rowToIzishipProduct(headers, row, i) {
  const idx = {
    id:           colIdx(headers, 'ID'),
    locationCode: colIdx(headers, 'Code site'),
    sku:          colIdx(headers, 'SKU'),
    ean:          colIdx(headers, 'EAN'),
    name:         colIdx(headers, 'Nom produit'),
    stock:        colIdx(headers, 'Stock physique total'),
    active:       colIdx(headers, 'Actif?'),
    rank:         colIdx(headers, 'Rank'),
    pareto:       colIdx(headers, 'Pareto'),
    weight:       colIdx(headers, 'Poids (kg)'),
    lastPicking:  colIdx(headers, 'Dernier Picking'),
  };
  const get = (k) => (idx[k] >= 0 ? (row[idx[k]] || '').trim() : '');

  // Préfère l'ID Iziship (déjà unique côté WMS) ; sinon fallback aléatoire
  const wmsId = get('id');
  const id = wmsId ? `izi-${wmsId}` : genLocalId('imp', i);

  return {
    id,
    sku: get('sku'),
    name: get('name'),
    ean: get('ean'),
    locationCode: get('locationCode'),
    pareto: get('pareto'),
    rank: parseNum(get('rank')),
    stock: parseNum(get('stock')) ?? 0,
    weight: parseNum(get('weight')),
    lastPicking: get('lastPicking'),
    active: parseBool(get('active')),
    rotation: 0, // pas de rotation explicite dans l'export Iziship — pareto fait foi
    x: null,
    y: null,
  };
}

export default function ImportView({ saveProducts, products, showToast }) {
  const [csvText, setCsvText] = useState('');
  const [preview, setPreview] = useState(null);
  const [format, setFormat] = useState('simple');
  const [mapping, setMapping] = useState({ sku: 0, name: 1, rotation: 2, x: 3, y: 4 });
  // Message d'overlay non-null = traitement en cours, l'UI est verrouillée.
  const [busy, setBusy] = useState(null);
  const fileInput = useRef(null);

  // Laisse le navigateur peindre avant d'attaquer une opération bloquante.
  const yieldToBrowser = () => new Promise((r) => setTimeout(r, 0));

  const analyse = (text) => {
    const parsed = parseCSV(text);
    if (!parsed) { setPreview(null); return; }
    const fmt = detectFormat(parsed.headers);
    setFormat(fmt);
    setPreview(parsed);
    if (fmt === 'simple') {
      // Re-tente une auto-détection des colonnes par leur nom pour le format simple
      setMapping({
        sku:      Math.max(0, colIdx(parsed.headers, 'SKU')),
        name:     Math.max(0, colIdx(parsed.headers, 'Nom') >= 0 ? colIdx(parsed.headers, 'Nom') : 1),
        rotation: Math.max(0, colIdx(parsed.headers, 'Rotation') >= 0 ? colIdx(parsed.headers, 'Rotation') : 2),
        x:        Math.max(0, colIdx(parsed.headers, 'X') >= 0 ? colIdx(parsed.headers, 'X') : 3),
        y:        Math.max(0, colIdx(parsed.headers, 'Y') >= 0 ? colIdx(parsed.headers, 'Y') : 4),
      });
    }
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target.result;
      setCsvText(text);
      setBusy('Analyse du fichier…');
      await yieldToBrowser();
      analyse(text);
      setBusy(null);
    };
    reader.readAsText(file);
  };

  const parseText = async () => {
    setBusy('Analyse…');
    await yieldToBrowser();
    analyse(csvText);
    setBusy(null);
  };

  const buildImported = () => {
    if (!preview) return [];
    if (format === 'iziship') {
      return preview.rows
        .map((r, i) => rowToIzishipProduct(preview.headers, r, i))
        .filter((p) => p.sku);
    }
    // Format simple historique
    return preview.rows
      .filter((r) => r[mapping.sku])
      .map((r, i) => ({
        id: genLocalId('imp', i),
        sku: (r[mapping.sku] || '').trim(),
        name: (r[mapping.name] || '').trim(),
        rotation: parseNum(r[mapping.rotation]) ?? 0,
        x: parseNum(r[mapping.x]),
        y: parseNum(r[mapping.y]),
        active: true,
      }));
  };

  const importNow = async (mode) => {
    setBusy('Préparation de l\'import…');
    await yieldToBrowser();

    const imported = buildImported();
    if (!imported.length) {
      setBusy(null);
      showToast('Aucune ligne à importer', 'error');
      return;
    }

    setBusy(`Sauvegarde de ${imported.length.toLocaleString('fr-FR')} produits…`);
    await yieldToBrowser();

    try {
      if (mode === 'replace') {
        await saveProducts(imported);
        showToast(`${imported.length} produits importés (remplacement)`);
      } else {
        await saveProducts([...products, ...imported]);
        showToast(`${imported.length} produits ajoutés`);
      }
      setPreview(null);
      setCsvText('');
      if (fileInput.current) fileInput.current.value = '';
    } catch (e) {
      console.error(e);
      showToast('Erreur lors de la sauvegarde', 'error');
    } finally {
      setBusy(null);
    }
  };

  // Aperçu : pour Iziship, on n'affiche qu'un sous-ensemble de colonnes lisibles
  const iziCols = ['Code site', 'SKU', 'Nom produit', 'Stock physique total', 'Actif?', 'Rank', 'Pareto'];
  const iziPreviewIdx = format === 'iziship' && preview
    ? iziCols.map((c) => ({ name: c, idx: colIdx(preview.headers, c) })).filter((x) => x.idx >= 0)
    : [];

  return (
    <div>
      {busy && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(10, 10, 10, 0.78)',
          backdropFilter: 'blur(2px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div className="card" style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            borderColor: '#f59e0b',
            minWidth: 280,
          }}>
            <div style={{
              width: 14, height: 14, borderRadius: '50%',
              border: '2px solid #27272a',
              borderTopColor: '#f59e0b',
              animation: 'spin 0.8s linear infinite',
            }} />
            <div>
              <div className="display" style={{ fontSize: 13, color: '#a1a1aa', letterSpacing: '0.1em', marginBottom: 2 }}>TRAITEMENT</div>
              <div style={{ fontSize: 13 }}>{busy}</div>
            </div>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      <div className="display" style={{ fontSize: 28, marginBottom: 6 }}>Import de données</div>
      <div style={{ color: '#71717a', fontSize: 13, marginBottom: 24 }}>
        Importez votre catalogue depuis un export Iziship (.csv) ou un CSV simple — le format est détecté automatiquement.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div className="card">
          <div className="display" style={{ fontSize: 13, marginBottom: 10, color: '#a1a1aa', letterSpacing: '0.1em' }}>FORMAT IZISHIP</div>
          <div style={{ fontSize: 12, color: '#a1a1aa', lineHeight: 1.6 }}>
            Export du WMS, séparateur <code style={{ background: '#27272a', padding: '1px 5px', borderRadius: 3 }}>;</code>, valeurs entre guillemets.
            Détecté automatiquement par la présence des colonnes <strong>Code site</strong> et <strong>Pareto</strong>.
            La classification ABC est lue depuis le champ <strong>Pareto</strong> (pas recalculée).
            Les coordonnées X/Y restent vides — à associer plus tard via un mapping <em>code site</em>.
          </div>
        </div>
        <div className="card">
          <div className="display" style={{ fontSize: 13, marginBottom: 10, color: '#a1a1aa', letterSpacing: '0.1em' }}>FORMAT SIMPLE</div>
          <div style={{ fontSize: 12, color: '#a1a1aa', marginBottom: 8 }}>
            Une ligne par produit, colonnes : SKU, Nom, Rotation, X, Y.
          </div>
          <pre className="mono" style={{ background: '#0a0a0a', padding: 8, borderRadius: 4, fontSize: 11, color: '#a1a1aa', overflow: 'auto', margin: 0 }}>{`SKU,Nom,Rotation,X,Y
ABC123,Câble USB-C 1m,87,5,3
DEF456,Boîtier plastique,12,18,10`}</pre>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div className="card">
          <div className="display" style={{ fontSize: 13, marginBottom: 12, color: '#a1a1aa', letterSpacing: '0.1em' }}>FICHIER CSV</div>
          <input type="file" accept=".csv,.txt" ref={fileInput} onChange={handleFile} style={{ width: '100%' }} />
        </div>
        <div className="card">
          <div className="display" style={{ fontSize: 13, marginBottom: 12, color: '#a1a1aa', letterSpacing: '0.1em' }}>COPIER-COLLER</div>
          <textarea
            placeholder="Collez vos données CSV ici..."
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            style={{ width: '100%', minHeight: 80, resize: 'vertical' }}
          />
          <button className="btn" style={{ marginTop: 8 }} onClick={parseText}>Analyser</button>
        </div>
      </div>

      {preview && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="display" style={{ fontSize: 13, color: '#a1a1aa', letterSpacing: '0.1em' }}>
              APERÇU &amp; MAPPING ({preview.rows.length} lignes · séparateur «{preview.sep}»)
            </div>
            <span className="badge" style={{
              background: format === 'iziship' ? '#1e3a8a' : '#3f3f46',
              color: format === 'iziship' ? '#bfdbfe' : '#e4e4e7',
            }}>
              {format === 'iziship' ? 'Format Iziship détecté' : 'Format CSV simple'}
            </span>
          </div>

          {format === 'simple' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 14 }}>
              {['sku', 'name', 'rotation', 'x', 'y'].map((field) => (
                <div key={field}>
                  <div style={{ fontSize: 11, color: '#71717a', marginBottom: 4, textTransform: 'uppercase' }}>{field}</div>
                  <select value={mapping[field]} onChange={(e) => setMapping({ ...mapping, [field]: Number(e.target.value) })} style={{ width: '100%' }}>
                    {preview.headers.map((h, i) => <option key={i} value={i}>{i}: {h}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}

          {format === 'iziship' && (
            <div style={{ fontSize: 12, color: '#a1a1aa', marginBottom: 12 }}>
              Colonnes mappées automatiquement : <span className="mono">ID, Code site, SKU, EAN, Nom produit, Stock, Actif?, Rank, Pareto, Poids, Dernier Picking</span>.
            </div>
          )}

          <div style={{ overflow: 'auto', maxHeight: 280, border: '1px solid #27272a', borderRadius: 4 }}>
            <table>
              <thead>
                <tr>
                  {format === 'iziship'
                    ? iziPreviewIdx.map((c) => <th key={c.name}>{c.name}</th>)
                    : preview.headers.map((h, i) => <th key={i}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 8).map((r, i) => (
                  <tr key={i}>
                    {format === 'iziship'
                      ? iziPreviewIdx.map((c) => <td key={c.name} className="mono" style={{ fontSize: 12 }}>{r[c.idx] || ''}</td>)
                      : r.map((cell, j) => <td key={j} className="mono" style={{ fontSize: 12 }}>{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 14, justifyContent: 'flex-end' }}>
            <button className="btn-ghost btn" disabled={!!busy} onClick={() => importNow('append')}>Ajouter aux existants</button>
            <button className="btn" disabled={!!busy} onClick={() => importNow('replace')}>Remplacer tout</button>
          </div>
        </div>
      )}
    </div>
  );
}
