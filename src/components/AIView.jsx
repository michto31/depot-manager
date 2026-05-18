import React, { useMemo } from 'react';

export default function AIView({ optim, products, layout, stats }) {
  const suggestions = useMemo(() => {
    const list = [];
    if (!layout) return list;
    const { cells } = layout;

    const hasPrep = cells.includes('PREP');
    if (!hasPrep) list.push({ level: 'critical', title: 'Aucune zone de préparation définie', desc: 'Définissez au moins une zone PREP dans la cartographie pour permettre les calculs d\'optimisation.' });

    if (optim.misplaced && optim.misplaced.length > 0 && hasPrep) {
      list.push({
        level: 'high',
        title: `${optim.misplaced.length} produit(s) à forte rotation trop éloignés`,
        desc: 'Ces produits devraient être déplacés vers des emplacements plus proches des tables de préparation.',
        items: optim.misplaced.slice(0, 5).map((p) => `${p.sku} — ${p.name} (rot. ${p.rotation}, distance ${p.distance})`),
      });
    }

    if (optim.score < 50 && products.length > 0) {
      list.push({ level: 'medium', title: `Score global faible (${optim.score}/100)`, desc: 'Le placement actuel demande beaucoup de déplacements. Un réagencement permettrait de réduire significativement le temps de picking.' });
    } else if (optim.score >= 70 && products.length > 0) {
      list.push({ level: 'good', title: `Bon score d'optimisation (${optim.score}/100)`, desc: 'L\'agencement actuel est performant. Continuez à surveiller l\'évolution des rotations.' });
    }

    if (products.length === 0) {
      list.push({ level: 'medium', title: 'Catalogue vide', desc: 'Importez vos produits pour activer les analyses d\'optimisation.' });
    }

    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const s = stats[d.toISOString().slice(0, 10)];
      if (s && s.hours > 0) last7.push(s.picked / s.hours);
    }
    if (last7.length >= 5) {
      const half = Math.floor(last7.length / 2);
      const avg1 = last7.slice(0, half).reduce((a, b) => a + b, 0) / half;
      const avg2 = last7.slice(half).reduce((a, b) => a + b, 0) / (last7.length - half);
      const delta = ((avg2 - avg1) / avg1) * 100;
      if (delta < -10) list.push({ level: 'medium', title: `Productivité en baisse (${delta.toFixed(0)}%)`, desc: 'La productivité picks/heure a diminué récemment. Vérifiez si des produits à forte rotation ont été déplacés ou si le volume a changé.' });
      else if (delta > 10) list.push({ level: 'good', title: `Productivité en hausse (+${delta.toFixed(0)}%)`, desc: 'Bonne dynamique sur la productivité. Documentez ce qui a changé pour pérenniser.' });
    }

    return list;
  }, [optim, products, layout, stats]);

  const levelStyles = {
    critical: { border: '#dc2626', bg: '#7f1d1d', text: 'CRITIQUE' },
    high:     { border: '#ea580c', bg: '#7c2d12', text: 'PRIORITÉ HAUTE' },
    medium:   { border: '#f59e0b', bg: '#78350f', text: 'À SURVEILLER' },
    good:     { border: '#10b981', bg: '#064e3b', text: 'TOUT VA BIEN' },
  };

  return (
    <div>
      <div className="display" style={{ fontSize: 28, marginBottom: 6 }}>IA &amp; Optimisation</div>
      <div style={{ color: '#71717a', fontSize: 13, marginBottom: 24 }}>Recommandations basées sur l'analyse de vos données — Heuristiques de classification ABC et distance pondérée</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        <div className="card">
          <div className="stat-num" style={{ color: optim.score >= 70 ? '#10b981' : optim.score >= 40 ? '#f59e0b' : '#ef4444' }}>{optim.score}<span style={{ fontSize: 18, color: '#52525b' }}>/100</span></div>
          <div className="stat-label">Score global d'agencement</div>
        </div>
        <div className="card">
          <div className="stat-num">{optim.avgDist || '0'}</div>
          <div className="stat-label">Distance moyenne pondérée</div>
        </div>
        <div className="card">
          <div className="stat-num" style={{ color: optim.misplaced?.length > 0 ? '#ef4444' : '#10b981' }}>{optim.misplaced?.length || 0}</div>
          <div className="stat-label">Produits à repositionner</div>
        </div>
      </div>

      <div className="display" style={{ fontSize: 14, marginBottom: 14, color: '#a1a1aa', letterSpacing: '0.1em' }}>RECOMMANDATIONS</div>
      {suggestions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: '#52525b', padding: 40 }}>
          Pas encore assez de données pour générer des recommandations. Importez des produits et saisissez quelques jours de stats.
        </div>
      ) : (
        suggestions.map((s, i) => {
          const st = levelStyles[s.level];
          return (
            <div key={i} className="card" style={{ marginBottom: 10, borderLeft: `3px solid ${st.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span className="badge" style={{ background: st.bg, color: st.border }}>{st.text}</span>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{s.title}</div>
              </div>
              <div style={{ fontSize: 13, color: '#a1a1aa', marginBottom: s.items ? 10 : 0 }}>{s.desc}</div>
              {s.items && (
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#71717a' }}>
                  {s.items.map((it, j) => <li key={j} className="mono" style={{ marginBottom: 4 }}>{it}</li>)}
                </ul>
              )}
            </div>
          );
        })
      )}

      <div className="card" style={{ marginTop: 20, background: '#0f0f12' }}>
        <div className="display" style={{ fontSize: 13, marginBottom: 10, color: '#a1a1aa', letterSpacing: '0.1em' }}>MÉTHODOLOGIE</div>
        <div style={{ fontSize: 12, color: '#a1a1aa', lineHeight: 1.6 }}>
          Le score d'optimisation calcule la <strong>distance Manhattan pondérée</strong> entre chaque produit et la zone de préparation la plus proche, en utilisant la rotation comme poids. Plus un produit a une forte rotation, plus sa distance compte dans le score final.
          <br /><br />
          La <strong>classification ABC</strong> répartit les produits en 4 niveaux selon leur rotation :
          A (≥50, prioritaires), B (20-49), C (5-19), D (&lt;5, à archiver éventuellement).
          <br /><br />
          Au fur et à mesure que vous saisissez vos statistiques quotidiennes, l'analyse de tendance se précise et les recommandations s'affinent.
        </div>
      </div>
    </div>
  );
}
