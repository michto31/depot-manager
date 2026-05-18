import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ZONE_TYPES } from '../lib/constants.js';
import { todayKey } from '../lib/storage.js';

export default function Dashboard({ layout, products, stats, optim }) {
  const today = todayKey();
  const todayStats = stats[today] || { picked: 0, packed: 0, orders: 0 };

  const last7 = useMemo(() => {
    const arr = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const s = stats[key] || { picked: 0, packed: 0, orders: 0 };
      arr.push({ date: key.slice(5), picked: s.picked, packed: s.packed, orders: s.orders });
    }
    return arr;
  }, [stats]);

  const zonesCount = useMemo(() => {
    if (!layout) return {};
    const c = {};
    for (const cell of layout.cells) c[cell] = (c[cell] || 0) + 1;
    return c;
  }, [layout]);

  return (
    <div>
      <div className="display" style={{ fontSize: 28, marginBottom: 6 }}>Tableau de bord</div>
      <div style={{ color: '#71717a', fontSize: 13, marginBottom: 24 }}>Vue d'ensemble de votre dépôt — {today}</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        <div className="card">
          <div className="stat-num">{products.length}</div>
          <div className="stat-label">Produits référencés</div>
        </div>
        <div className="card">
          <div className="stat-num">{todayStats.picked}</div>
          <div className="stat-label">Picks aujourd'hui</div>
        </div>
        <div className="card">
          <div className="stat-num">{todayStats.packed}</div>
          <div className="stat-label">Colis emballés</div>
        </div>
        <div className="card">
          <div className="stat-num">{todayStats.orders}</div>
          <div className="stat-label">Commandes</div>
        </div>
        <div className="card">
          <div className="stat-num" style={{ color: optim.score >= 70 ? '#10b981' : optim.score >= 40 ? '#f59e0b' : '#ef4444' }}>{optim.score}</div>
          <div className="stat-label">Score d'optimisation</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
        <div className="card">
          <div className="display" style={{ fontSize: 14, marginBottom: 16, color: '#a1a1aa', letterSpacing: '0.1em' }}>ACTIVITÉ — 7 DERNIERS JOURS</div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={last7}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" stroke="#71717a" style={{ fontSize: 11 }} />
              <YAxis stroke="#71717a" style={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 4 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="picked" stroke="#f59e0b" strokeWidth={2} name="Picks" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="packed" stroke="#10b981" strokeWidth={2} name="Packs" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} name="Commandes" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="display" style={{ fontSize: 14, marginBottom: 16, color: '#a1a1aa', letterSpacing: '0.1em' }}>RÉPARTITION DES ZONES</div>
          {Object.entries(ZONE_TYPES).filter(([k]) => k !== 'EMPTY' && k !== 'WALL').map(([k, z]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, fontSize: 13 }}>
              <div style={{ width: 14, height: 14, background: z.color, borderRadius: 2 }}></div>
              <div style={{ flex: 1 }}>{z.label}</div>
              <div className="mono" style={{ color: '#a1a1aa' }}>{zonesCount[k] || 0}</div>
            </div>
          ))}
        </div>
      </div>

      {optim.misplaced && optim.misplaced.length > 0 && (
        <div className="card" style={{ marginTop: 14, borderColor: '#7c2d12' }}>
          <div className="display" style={{ fontSize: 14, marginBottom: 12, color: '#f59e0b', letterSpacing: '0.1em' }}>⚠ PRODUITS MAL PLACÉS (forte rotation, distance &gt; 5)</div>
          <div style={{ fontSize: 13, color: '#a1a1aa' }}>{optim.misplaced.length} produit{optim.misplaced.length > 1 ? 's' : ''} à rapprocher de la zone Préparation — voir l'onglet IA &amp; Optimisation</div>
        </div>
      )}
    </div>
  );
}
