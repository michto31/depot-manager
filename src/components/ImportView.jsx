import React, { useState, useRef } from 'react';

export default function ImportView({ saveProducts, products, showToast }) {
  const [csvText, setCsvText] = useState('');
  const [preview, setPreview] = useState(null);
  const [mapping, setMapping] = useState({ sku: 0, name: 1, rotation: 2, x: 3, y: 4 });
  const fileInput = useRef(null);

  const parseCSV = (text) => {
    const lines = text.trim().split(/\r?\n/);
    if (!lines.length) return null;
    const sep = lines[0].split(';').length > lines[0].split(',').length ? ';' : ',';
    const headers = lines[0].split(sep).map((h) => h.trim());
    const rows = lines.slice(1).map((l) => l.split(sep).map((c) => c.trim()));
    return { headers, rows, sep };
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      setCsvText(text);
      setPreview(parseCSV(text));
    };
    reader.readAsText(file);
  };

  const parseText = () => {
    setPreview(parseCSV(csvText));
  };

  const importNow = (mode) => {
    if (!preview) return;
    const imported = preview.rows
      .filter((r) => r[mapping.sku])
      .map((r, i) => ({
        id: Date.now().toString() + '-' + i,
        sku: r[mapping.sku] || '',
        name: r[mapping.name] || '',
        rotation: Number(r[mapping.rotation]) || 0,
        x: Number(r[mapping.x]) || 0,
        y: Number(r[mapping.y]) || 0,
      }));
    if (mode === 'replace') {
      saveProducts(imported);
      showToast(`${imported.length} produits importés (remplacement)`);
    } else {
      saveProducts([...products, ...imported]);
      showToast(`${imported.length} produits ajoutés`);
    }
    setPreview(null);
    setCsvText('');
  };

  return (
    <div>
      <div className="display" style={{ fontSize: 28, marginBottom: 6 }}>Import de données</div>
      <div style={{ color: '#71717a', fontSize: 13, marginBottom: 24 }}>Importez votre catalogue produits depuis un fichier CSV ou par copier-coller</div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="display" style={{ fontSize: 13, marginBottom: 14, color: '#a1a1aa', letterSpacing: '0.1em' }}>FORMAT ATTENDU</div>
        <div style={{ fontSize: 13, color: '#a1a1aa', marginBottom: 10 }}>
          Une ligne par produit, séparateur <code style={{ background: '#27272a', padding: '2px 6px', borderRadius: 3 }}>,</code> ou <code style={{ background: '#27272a', padding: '2px 6px', borderRadius: 3 }}>;</code>. Colonnes recommandées :
        </div>
        <pre className="mono" style={{ background: '#0a0a0a', padding: 12, borderRadius: 4, fontSize: 12, color: '#a1a1aa', overflow: 'auto' }}>{`SKU,Nom,Rotation,X,Y
ABC123,Câble USB-C 1m,87,5,3
DEF456,Boîtier plastique,12,18,10
GHI789,Vis M6 x100,45,8,5`}</pre>
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
          <div className="display" style={{ fontSize: 13, marginBottom: 12, color: '#a1a1aa', letterSpacing: '0.1em' }}>APERÇU &amp; MAPPING ({preview.rows.length} lignes)</div>

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

          <div style={{ overflow: 'auto', maxHeight: 250, border: '1px solid #27272a', borderRadius: 4 }}>
            <table>
              <thead>
                <tr>{preview.headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 8).map((r, i) => (
                  <tr key={i}>{r.map((c, j) => <td key={j} className="mono" style={{ fontSize: 12 }}>{c}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 14, justifyContent: 'flex-end' }}>
            <button className="btn-ghost btn" onClick={() => importNow('append')}>Ajouter aux existants</button>
            <button className="btn" onClick={() => importNow('replace')}>Remplacer tout</button>
          </div>
        </div>
      )}
    </div>
  );
}
