import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { todayKey } from '../lib/storage.js';

export default function StatsView({ stats, saveStats, showToast }) {
  const [date, setDate] = useState(todayKey());
  const current = stats[date] || { picked: 0, packed: 0, orders: 0, errors: 0, hours: 0 };
  const [form, setForm] = useState(current);

  useEffect(() => {
    setForm(stats[date] || { picked: 0, packed: 0, orders: 0, errors: 0, hours: 0 });
  }, [date, stats]);

  const save = () => {
    saveStats({ ...stats, [date]: form });
    showToast('Statistiques enregistrées');
  };

  const last30 = useMemo(() => {
    const arr = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = d.toISOString().slice(0, 10);
      const s = stats[k] || { picked: 0, packed: 0, orders: 0, errors: 0, hours: 0 };
      arr.push({ date: k.slice(5), ...s, productivity: s.hours > 0 ? Math.round(s.picked / s.hours) : 0 });
    }
    return arr;
  }, [stats]);

  const totals = useMemo(() => {
    return last30.reduce(
      (acc, d) => ({
        picked: acc.picked + d.picked,
        packed: acc.packed + d.packed,
        orders: acc.orders + d.orders,
        errors: acc.errors + d.errors,
        hours: acc.hours + d.hours,
      }),
      { picked: 0, packed: 0, orders: 0, errors: 0, hours: 0 }
    );
  }, [last30]);

  return (
    <div>
      <div className="display" style={{ fontSize: 28, marginBottom: 6 }}>Statistiques</div>
      <div style={{ color: '#71717a', fontSize: 13, marginBottom: 24 }}>Suivi quotidien de la production · Vue 30 jours</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div className="card"><div className="stat-num">{totals.picked.toLocaleString()}</div><div className="stat-label">Picks (30j)</div></div>
        <div className="card"><div className="stat-num">{totals.packed.toLocaleString()}</div><div className="stat-label">Packs (30j)</div></div>
        <div className="card"><div className="stat-num">{totals.orders.toLocaleString()}</div><div className="stat-label">Commandes (30j)</div></div>
        <div className="card"><div className="stat-num" style={{ color: '#ef4444' }}>{totals.errors}</div><div className="stat-label">Erreurs (30j)</div></div>
        <div className="card"><div className="stat-num" style={{ color: '#10b981' }}>{totals.hours > 0 ? Math.round(totals.picked / totals.hours) : 0}</div><div className="stat-label">Picks/heure moyen</div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div className="card">
          <div className="display" style={{ fontSize: 13, marginBottom: 16, color: '#a1a1aa', letterSpacing: '0.1em' }}>VOLUME — 30 JOURS</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={last30}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" stroke="#71717a" style={{ fontSize: 10 }} />
              <YAxis stroke="#71717a" style={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46' }} />
              <Bar dataKey="picked" fill="#f59e0b" name="Picks" />
              <Bar dataKey="packed" fill="#10b981" name="Packs" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div className="display" style={{ fontSize: 13, marginBottom: 16, color: '#a1a1aa', letterSpacing: '0.1em' }}>PRODUCTIVITÉ (PICKS/H)</div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={last30}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" stroke="#71717a" style={{ fontSize: 10 }} />
              <YAxis stroke="#71717a" style={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46' }} />
              <Line type="monotone" dataKey="productivity" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="display" style={{ fontSize: 13, marginBottom: 16, color: '#a1a1aa', letterSpacing: '0.1em' }}>SAISIE JOURNALIÈRE</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr) auto', gap: 10, alignItems: 'end' }}>
          <div>
            <div style={{ fontSize: 11, color: '#71717a', marginBottom: 4 }}>Date</div>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: '100%' }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#71717a', marginBottom: 4 }}>Picks</div>
            <input type="number" value={form.picked} onChange={(e) => setForm({ ...form, picked: Number(e.target.value) })} style={{ width: '100%' }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#71717a', marginBottom: 4 }}>Packs</div>
            <input type="number" value={form.packed} onChange={(e) => setForm({ ...form, packed: Number(e.target.value) })} style={{ width: '100%' }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#71717a', marginBottom: 4 }}>Commandes</div>
            <input type="number" value={form.orders} onChange={(e) => setForm({ ...form, orders: Number(e.target.value) })} style={{ width: '100%' }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#71717a', marginBottom: 4 }}>Erreurs</div>
            <input type="number" value={form.errors} onChange={(e) => setForm({ ...form, errors: Number(e.target.value) })} style={{ width: '100%' }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#71717a', marginBottom: 4 }}>Heures</div>
            <input type="number" step="0.5" value={form.hours} onChange={(e) => setForm({ ...form, hours: Number(e.target.value) })} style={{ width: '100%' }} />
          </div>
          <button className="btn" onClick={save}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
}
