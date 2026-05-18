import React, { useState, useEffect, useMemo } from 'react';
import { storageGet, storageSet, todayKey, isConfigured } from './lib/storage.js';
import { DEFAULT_GRID_W, DEFAULT_GRID_H } from './lib/constants.js';
import { computeOptimizationScore } from './lib/optimization.js';

import Dashboard from './components/Dashboard.jsx';
import MapEditor from './components/MapEditor.jsx';
import ProductsView from './components/ProductsView.jsx';
import StatsView from './components/StatsView.jsx';
import ImportView from './components/ImportView.jsx';
import AIView from './components/AIView.jsx';

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [layout, setLayout] = useState(null);
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    (async () => {
      const l = await storageGet('warehouse:layout');
      const p = await storageGet('products:list', []);
      const s = await storageGet('stats:daily', {});
      setLayout(l || {
        w: DEFAULT_GRID_W,
        h: DEFAULT_GRID_H,
        cells: Array(DEFAULT_GRID_W * DEFAULT_GRID_H).fill('EMPTY'),
      });
      setProducts(p);
      setStats(s);
      setLoaded(true);
    })();
  }, []);

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2400);
  };

  const saveLayout = async (l) => { setLayout(l); await storageSet('warehouse:layout', l); };
  // `onProgress(done, total)` est forwardé jusqu'à la couche storage pour
  // permettre à l'import massif (Iziship ~11k lignes) d'afficher une barre
  // de progression batch par batch.
  const saveProducts = async (p, onProgress) => { setProducts(p); await storageSet('products:list', p, onProgress); };
  const saveStats = async (s) => { setStats(s); await storageSet('stats:daily', s); };

  const optim = useMemo(() => computeOptimizationScore(products, layout), [products, layout]);

  // Garde-fou : si Supabase n'est pas configuré, on affiche un message clair
  // plutôt que de laisser l'app crasher sur le premier appel storage.
  if (!isConfigured) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="card" style={{ maxWidth: 560, borderColor: '#7c2d12' }}>
          <div className="display" style={{ fontSize: 14, color: '#f59e0b', letterSpacing: '0.1em', marginBottom: 12 }}>⚠ SUPABASE NON CONFIGURÉ</div>
          <div style={{ fontSize: 13, color: '#a1a1aa', lineHeight: 1.6, marginBottom: 14 }}>
            Les variables d'environnement <code className="mono" style={{ background: '#27272a', padding: '1px 5px', borderRadius: 3 }}>VITE_SUPABASE_URL</code> et <code className="mono" style={{ background: '#27272a', padding: '1px 5px', borderRadius: 3 }}>VITE_SUPABASE_ANON_KEY</code> sont absentes.
            Créez un fichier <code className="mono" style={{ background: '#27272a', padding: '1px 5px', borderRadius: 3 }}>.env.local</code> à la racine du projet avec ces deux variables, puis relancez <code className="mono" style={{ background: '#27272a', padding: '1px 5px', borderRadius: 3 }}>npm run dev</code>.
          </div>
          <pre className="mono" style={{ background: '#0a0a0a', padding: 12, borderRadius: 4, fontSize: 11, color: '#a1a1aa', overflow: 'auto', margin: 0 }}>{`VITE_SUPABASE_URL=https://<projet>.supabase.co
VITE_SUPABASE_ANON_KEY=<clé anon>`}</pre>
        </div>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="mono">Chargement du dépôt...</span>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid #27272a', background: '#0f0f12' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 36, height: 36, background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, color: '#0a0a0a', fontWeight: 800, fontFamily: 'Oswald' }}>D</div>
            <div>
              <div className="display" style={{ fontSize: 18, fontWeight: 700, letterSpacing: '0.05em' }}>DÉPÔT MANAGER</div>
              <div style={{ fontSize: 11, color: '#71717a' }}>Optimisation rotation &amp; flux</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div className="pill"><span style={{ width: 6, height: 6, background: '#10b981', borderRadius: '50%' }}></span> Synchronisé</div>
            <div className="pill mono">{todayKey()}</div>
          </div>
        </div>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px', display: 'flex', gap: 4 }}>
          {[
            ['dashboard', 'Tableau de bord'],
            ['map', 'Cartographie'],
            ['products', 'Produits & Rotation'],
            ['stats', 'Statistiques'],
            ['import', 'Import données'],
            ['ai', 'IA & Optimisation'],
          ].map(([id, label]) => (
            <button key={id} className={`tab-btn ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>
      </header>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: toast.type === 'error' ? '#7f1d1d' : '#18181b', color: '#fafafa', padding: '12px 18px', borderRadius: 4, border: `1px solid ${toast.type === 'error' ? '#dc2626' : '#3f3f46'}`, zIndex: 999, fontSize: 13 }}>
          {toast.msg}
        </div>
      )}

      <main style={{ maxWidth: 1400, margin: '0 auto', padding: 24 }}>
        {tab === 'dashboard' && <Dashboard layout={layout} products={products} stats={stats} optim={optim} />}
        {tab === 'map' && <MapEditor layout={layout} saveLayout={saveLayout} products={products} showToast={showToast} />}
        {tab === 'products' && <ProductsView products={products} saveProducts={saveProducts} showToast={showToast} />}
        {tab === 'stats' && <StatsView stats={stats} saveStats={saveStats} showToast={showToast} />}
        {tab === 'import' && <ImportView saveProducts={saveProducts} products={products} showToast={showToast} />}
        {tab === 'ai' && <AIView optim={optim} products={products} layout={layout} stats={stats} />}
      </main>

      <footer style={{ maxWidth: 1400, margin: '0 auto', padding: '20px 24px 40px', borderTop: '1px solid #1f1f23', marginTop: 40, fontSize: 11, color: '#52525b', display: 'flex', justifyContent: 'space-between' }}>
        <div>Données sauvegardées · Supabase</div>
        <div className="mono">v0.1 · MVP</div>
      </footer>
    </div>
  );
}
