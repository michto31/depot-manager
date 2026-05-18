import React, { useState, useMemo } from 'react';
import { ZONE_TYPES } from '../lib/constants.js';

export default function MapEditor({ layout, saveLayout, products, showToast }) {
  const [brush, setBrush] = useState('PICK');
  const [size, setSize] = useState({ w: layout.w, h: layout.h });
  const [isPainting, setIsPainting] = useState(false);
  const [showProducts, setShowProducts] = useState(true);

  const resize = (nw, nh) => {
    const newCells = Array(nw * nh).fill('EMPTY');
    for (let j = 0; j < Math.min(layout.h, nh); j++) {
      for (let i = 0; i < Math.min(layout.w, nw); i++) {
        newCells[j * nw + i] = layout.cells[j * layout.w + i];
      }
    }
    saveLayout({ w: nw, h: nh, cells: newCells });
  };

  const paint = (idx) => {
    const newCells = [...layout.cells];
    newCells[idx] = brush;
    saveLayout({ ...layout, cells: newCells });
  };

  const productsAtCell = useMemo(() => {
    const map = {};
    for (const p of products) {
      if (p.x != null && p.y != null) {
        const k = p.y * layout.w + p.x;
        map[k] = (map[k] || 0) + 1;
      }
    }
    return map;
  }, [products, layout.w]);

  const presetTemplate = () => {
    const w = 20, h = 12;
    const cells = Array(w * h).fill('EMPTY');
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) cells[j * w + i] = 'RECEPT';
    for (let i = w - 4; i < w; i++) for (let j = 0; j < 2; j++) cells[j * w + i] = 'DISPATCH';
    for (let i = 8; i < 12; i++) for (let j = 0; j < 2; j++) cells[j * w + i] = 'PREP';
    for (const row of [3, 5, 7]) for (let i = 1; i < w - 1; i++) cells[row * w + i] = 'PICK';
    for (const row of [9, 10]) for (let i = 1; i < w - 1; i++) cells[row * w + i] = 'PALLET';
    saveLayout({ w, h, cells });
    showToast('Modèle de dépôt chargé');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div className="display" style={{ fontSize: 28, marginBottom: 6 }}>Cartographie du dépôt</div>
          <div style={{ color: '#71717a', fontSize: 13 }}>Cliquez et glissez pour dessiner les zones · Grille {layout.w}×{layout.h}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost btn" onClick={presetTemplate}>Charger modèle</button>
          <button className="btn-ghost btn" onClick={() => { if (confirm('Tout effacer ?')) saveLayout({ ...layout, cells: Array(layout.w * layout.h).fill('EMPTY') }); }}>Effacer</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>
        <div>
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="display" style={{ fontSize: 13, marginBottom: 12, color: '#a1a1aa', letterSpacing: '0.1em' }}>PINCEAU</div>
            {Object.values(ZONE_TYPES).map((z) => (
              <button key={z.id} onClick={() => setBrush(z.id)} style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: 8,
                background: brush === z.id ? '#27272a' : 'transparent',
                border: brush === z.id ? '1px solid #f59e0b' : '1px solid transparent',
                borderRadius: 4, cursor: 'pointer', color: '#e4e4e7', textAlign: 'left', marginBottom: 4, fontSize: 13,
              }}>
                <div style={{ width: 18, height: 18, background: z.color, borderRadius: 2, border: '1px solid #3f3f46' }}></div>
                <div style={{ flex: 1 }}>{z.label}</div>
                <div className="mono" style={{ fontSize: 10, color: '#71717a' }}>{z.short}</div>
              </button>
            ))}
          </div>

          <div className="card" style={{ marginBottom: 12 }}>
            <div className="display" style={{ fontSize: 13, marginBottom: 12, color: '#a1a1aa', letterSpacing: '0.1em' }}>DIMENSIONS</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, width: 60 }}>Largeur</span>
              <input type="number" min="5" max="40" value={size.w} onChange={(e) => setSize({ ...size, w: Number(e.target.value) })} style={{ width: '100%' }} />
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 12, width: 60 }}>Hauteur</span>
              <input type="number" min="5" max="30" value={size.h} onChange={(e) => setSize({ ...size, h: Number(e.target.value) })} style={{ width: '100%' }} />
            </div>
            <button className="btn" style={{ width: '100%' }} onClick={() => resize(size.w, size.h)}>Redimensionner</button>
          </div>

          <div className="card">
            <div className="display" style={{ fontSize: 13, marginBottom: 12, color: '#a1a1aa', letterSpacing: '0.1em' }}>AFFICHAGE</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={showProducts} onChange={(e) => setShowProducts(e.target.checked)} />
              <span>Afficher les produits</span>
            </label>
          </div>
        </div>

        <div className="card" style={{ overflow: 'auto', userSelect: 'none' }}>
          <div
            onMouseLeave={() => setIsPainting(false)}
            style={{ display: 'grid', gridTemplateColumns: `repeat(${layout.w}, minmax(28px, 1fr))`, gap: 2, padding: 4 }}
          >
            {layout.cells.map((cell, idx) => {
              const z = ZONE_TYPES[cell] || ZONE_TYPES.EMPTY;
              const x = idx % layout.w, y = Math.floor(idx / layout.w);
              const prodCount = productsAtCell[idx] || 0;
              return (
                <div
                  key={idx}
                  onMouseDown={() => { setIsPainting(true); paint(idx); }}
                  onMouseEnter={() => isPainting && paint(idx)}
                  onMouseUp={() => setIsPainting(false)}
                  title={`(${x},${y}) ${z.label}${prodCount ? ` · ${prodCount} prod` : ''}`}
                  style={{
                    aspectRatio: '1',
                    background: z.color,
                    border: '1px solid rgba(255,255,255,0.05)',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
                    color: cell === 'EMPTY' ? '#3f3f46' : 'rgba(255,255,255,0.4)',
                  }}
                >
                  {showProducts && prodCount > 0 ? (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fafafa', boxShadow: '0 0 4px rgba(255,255,255,0.8)' }}></div>
                  ) : z.short}
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: '#52525b', display: 'flex', gap: 16 }}>
            <span>Cliquer &amp; glisser pour peindre</span>
            <span>•</span>
            <span>Pinceau actuel : <strong style={{ color: ZONE_TYPES[brush].color }}>{ZONE_TYPES[brush].label}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
