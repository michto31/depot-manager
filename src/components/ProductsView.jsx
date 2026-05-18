import React, { useState, useMemo } from 'react';
import { rotationClass } from '../lib/optimization.js';

export default function ProductsView({ products, saveProducts, showToast }) {
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState('rotation');
  const [showAdd, setShowAdd] = useState(false);
  const [newProd, setNewProd] = useState({ sku: '', name: '', rotation: 0, x: 0, y: 0 });

  const filtered = useMemo(() => {
    let arr = [...products];
    if (filter) arr = arr.filter((p) => (p.sku + ' ' + p.name).toLowerCase().includes(filter.toLowerCase()));
    if (sortBy === 'rotation') arr.sort((a, b) => Number(b.rotation || 0) - Number(a.rotation || 0));
    if (sortBy === 'name') arr.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    if (sortBy === 'sku') arr.sort((a, b) => (a.sku || '').localeCompare(b.sku || ''));
    return arr;
  }, [products, filter, sortBy]);

  const addProduct = () => {
    if (!newProd.sku || !newProd.name) { showToast('SKU et nom requis', 'error'); return; }
    saveProducts([...products, { ...newProd, id: Date.now().toString() }]);
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div className="display" style={{ fontSize: 28, marginBottom: 6 }}>Produits &amp; Rotation</div>
          <div style={{ color: '#71717a', fontSize: 13 }}>{products.length} produit{products.length > 1 ? 's' : ''} référencé{products.length > 1 ? 's' : ''} · Classification ABC par rotation</div>
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

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input placeholder="Filtrer par SKU ou nom..." value={filter} onChange={(e) => setFilter(e.target.value)} style={{ flex: 1 }} />
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="rotation">Tri : Rotation</option>
          <option value="name">Tri : Nom</option>
          <option value="sku">Tri : SKU</option>
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#52525b' }}>
            <div style={{ marginBottom: 12, fontSize: 14 }}>Aucun produit</div>
            <div style={{ fontSize: 12 }}>Ajoutez des produits manuellement ou via l'import de fichiers</div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: 50 }}>Cl.</th>
                <th>SKU</th>
                <th>Nom</th>
                <th>Rotation</th>
                <th>Position</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const cls = rotationClass(p.rotation);
                return (
                  <tr key={p.id}>
                    <td><span className="badge" style={{ background: cls.bg, color: cls.color }}>{cls.label}</span></td>
                    <td className="mono">{p.sku}</td>
                    <td>{p.name}</td>
                    <td>
                      <input type="number" value={p.rotation || 0} onChange={(e) => updateProduct(p.id, 'rotation', Number(e.target.value))} style={{ width: 80 }} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <input type="number" value={p.x || 0} onChange={(e) => updateProduct(p.id, 'x', Number(e.target.value))} style={{ width: 50 }} />
                        <span style={{ color: '#52525b' }}>,</span>
                        <input type="number" value={p.y || 0} onChange={(e) => updateProduct(p.id, 'y', Number(e.target.value))} style={{ width: 50 }} />
                      </div>
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
