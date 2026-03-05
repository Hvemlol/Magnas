import { useState, useEffect } from 'react';
import api from '../services/api';
import ProductCard from '../components/ProductCard';

export default function Saved() {
  const [saved, setSaved] = useState([]); // [{ savedId, product }]
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadSaved(); }, []);

  async function loadSaved() {
    try {
      const res = await api.get('/saved');
      setSaved(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  function handleUnsaved(productId) {
    setSaved(s => s.filter(item => item.product.id !== productId));
  }

  return (
    <div style={styles.page}>
      <h2 style={styles.heading}>Saved Products</h2>
      {loading && <p style={styles.msg}>Loading...</p>}
      {!loading && saved.length === 0 && (
        <p style={styles.msg}>No saved products yet. Browse and save products you like.</p>
      )}
      <div style={styles.grid}>
        {saved.map(item => (
          <ProductCard
            key={item.savedId}
            product={item.product}
            savedId={item.savedId}
            onUnsaved={handleUnsaved}
          />
        ))}
      </div>
    </div>
  );
}

const styles = {
  page:    { padding: '24px', maxWidth: '1100px', margin: '0 auto' },
  heading: { fontSize: '1.4rem', fontWeight: 700, marginBottom: '16px', color: '#000000' },
  grid:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' },
  msg:     { color: '#808080' },
};
