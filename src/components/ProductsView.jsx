import React, { useState, useMemo } from 'react';
import { productClass } from '../lib/optimization.js';

export default function ProductsView({ products, saveProducts, showToast }) {
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState('rank');
  const [showAdd, setShowAdd] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [newProd, setNewProd] = useState({ sku: '', name: '', rotation: 0, x: 0, y: 0 });

  // Indique si le catalogue contient des données Iziship (au moins un produit avec pareto/rank)
  const hasIzishipData = useMemo(
    () => products.some((p) => p.pareto || p.rank || p.locationCode),
    [products]
  );

  const filtered = useMemo(() => {
    let arr = [...products];

    // Filtre actif/inactif : par défaut on cache les inactifs (Actif? = False)
    if (!showInactive) {
      arr = arr.filter((p) => p.active !== false);
    }

    if (filter) {
      const q = filter.toLowerCase();
      arr = arr.filter((p) =>
        ((p.sku || '') + ' ' + (p.name || '') + ' ' + (p.ean || '') + ' ' + (p.locationCode || ''))
          .toLowerCase()
          .includes(q)
      );
    }

    if (sortBy === 'rank') {
      // Tri par rang croissant (1 = top vendeur). Les sans-rang en queue.
      arr.sort((a, b) => {
        const ra = a.rank == null ? Infinity : Number(a.rank);
        const rb = b.rank == null ? Infinity : Number(b.rank);
        return ra - rb;
      });
    }
    if (sortBy === 'rotation') arr.sort((a, b) => Number(b.rotation || 0) - Number(a.rotation || 0));
    if (sortBy === 'stock') arr.sort((a, b) => Number(b.stock || 0) - Number(a.stock || 0));
    if (sortBy === 'name') arr.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    if (sortBy === 'sku') arr.sort((a, b) => (a.sku || '').localeCompare(b.sku || ''));
    if (sortBy === 'location') arr.sort((a, b) => (a.locationCode || '').localeCompare(b.locationCode || ''));
    return arr;
  }, [products, filter, sortBy, showInactive]);

  const inactiveCount = useMemo(
    () => products.filter((p) => p.active === false).length,
    [products]
  );

  const addProduct = () => {
    if (!newProd.sku || !newProd.name) { showToast('SKU et nom requis', 'error'); return; }
    saveProducts([...products, { ...newProd, active: true, id: Date.now().toString() }]);
    setNewProd({ sku: '', name: '', rotation: 0, x: 0, y: 0 });
    setShowAdd(false);
    showToast('Produit ajouté');
  };

  const updateProduct = (id, field, value) => {
    saveProducts(products.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const deleteProduct = (id) => {
    if (confirm('Supprimer ce produit ?')) saveProducts(products.filter((p) => p.id !== id));
  };

  // Formatte une coordonnée pour l'input : null → champ vide
  const coordVal = (v) => (v == null || v === '' ? '' : v);
  const onCoordChange = (id, field, raw) => {
    if (raw === '') updateProduct(id, field, null);
    else updateProduct(id, field, Number(raw));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div className="display" style={{ fontSize: 28, marginBottom: 6 }}>Produits &amp; Rotation</div>
          <div style={{ color: '#71717a', fontSize: 13 }}>
            {products.length} produit{products.length > 1 ? 's' : ''} référencé{products.length > 1 ? 's' : ''}
            {inactiveCount > 0 && ` · ${inactiveCount} inactif${inactiveCount > 1 ? 's' : ''}`}
            {' · '}Classification {hasIzishipData ? 'Pareto (WMS)' : 'ABC par rotation'}
          </div>
        </div>
        <button className="btn" onClick={() => setShowAdd(!showAdd)}>+ Ajouter</button>
      </div>

      {showAdd && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="display" style={{ fontSize: 13, marginBottom: 12, color: '#a1a1aa', letterSpacing: '0.1em' }}>NOUVEAU PRODUIT</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr) auto', gap: 8 }}>
            <input placeholder="SKU" value={newProd.sku} onChange={(e) => setNewProd({ ...newProd, sku: e.target.value })} />
            <input placeholder="Nom du produit" value={newProd.name} onChange={(e) => setNewProd({ ...newProd, name: e.target.value })} />
            <input type="number" placeholder="Rotation (picks/sem)" value={newProd.rotation} onChange={(e) => setNewProd({ ...newProd, rotation: Number(e.target.value) })} />
            <input type="number" placeholder="X" value={newProd.x} onChange={(e) => setNewProd({ ...newProd, x: Number(e.target.value) })} />
            <input type="number" placeholder="Y" value={newProd.y} onChange={(e) => setNewProd({ ...newProd, y: Number(e.target.value) })} />
            <button className="btn" onClick={addProduct}>Créer</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <input placeholder="Filtrer par SKU, nom, EAN ou code site..." value={filter} onChange={(e) => setFilter(e.target.value)} style={{ flex: 1 }} />
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="rank">Tri : Rank</option>
          <option value="rotation">Tri : Rotation</option>
          <option value="stock">Tri : Stock</option>
          <option value="location">Tri : Code site</option>
          <option value="name">Tri : Nom</option>
          <option value="sku">Tri : SKU</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#a1a1aa', whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Inclure inactifs
        </label>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#52525b' }}>
            <div style={{ marginBottom: 12, fontSize: 14 }}>Aucun produit</div>
            <div style={{ fontSize: 12 }}>
              {products.length > 0 && !showInactive
                ? 'Tous les produits sont marqués inactifs — cochez « Inclure inactifs » pour les voir.'
                : 'Ajoutez des produits manuellement ou via l\'import de fichiers'}
            </div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: 50 }}>Cl.</th>
                <th>SKU</th>
                <th>Nom</th>
                <th>Code site</th>
                <th style={{ width: 70 }}>Stock</th>
                <th style={{ width: 70 }}>Rank</th>
                <th style={{ width: 90 }}>Rotation</th>
                <th>Position</th>
                <th style={{ width: 60 }}>Actif</th>
                <th style={{ width: 50 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const cls = productClass(p);
                const isInactive = p.active === false;
                return (
                  <tr key={p.id} style={isInactive ? { opacity: 0.5 } : undefined}>
                    <td><span className="badge" style={{ background: cls.bg, color: cls.color }}>{cls.label}</span></td>
                    <td className="mono">
                      {p.sku}
                      {p.ean && <div style={{ fontSize: 10, color: '#52525b' }}>{p.ean}</div>}
                    </td>
                    <td>{p.name}</td>
                    <td className="mono" style={{ fontSize: 12, color: p.locationCode ? '#e4e4e7' : '#52525b' }}>
                      {p.locationCode || '—'}
                    </td>
                    <td className="mono">{p.stock ?? 0}</td>
                    <td className="mono" style={{ color: p.rank == null ? '#52525b' : '#e4e4e7' }}>
                      {p.rank ?? '—'}
                    </td>
                    <td>
                      <input type="number" value={p.rotation || 0} onChange={(e) => updateProduct(p.id, 'rotation', Number(e.target.value))} style={{ width: 70 }} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <input
                          type="number"
                          placeholder="—"
                          value={coordVal(p.x)}
                          onChange={(e) => onCoordChange(p.id, 'x', e.target.value)}
                          style={{ width: 50 }}
                        />
                        <span style={{ color: '#52525b' }}>,</span>
                        <input
                          type="number"
                          placeholder="—"
                          value={coordVal(p.y)}
                          onChange={(e) => onCoordChange(p.id, 'y', e.target.value)}
                          style={{ width: 50 }}
                        />
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={p.active !== false}
                        onChange={(e) => updateProduct(p.id, 'active', e.target.checked)}
                      />
                    </td>
                    <td><button className="btn-ghost btn" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => deleteProduct(p.id)}>×</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
