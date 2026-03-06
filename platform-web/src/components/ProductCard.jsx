import { useState } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ProductCard({ product, savedId, onSaved, onUnsaved }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  async function handleSave() {
    setBusy(true);
    try {
      const res = await api.post('/saved', { productId: product.id });
      onSaved && onSaved(product.id, res.data.id);
    } catch (e) {
      alert(e.response?.data?.error ?? 'Failed to save.');
    } finally {
      setBusy(false);
    }
  }

  async function handleUnsave() {
    setBusy(true);
    try {
      await api.delete(`/saved/${savedId}`);
      onUnsaved && onUnsaved(product.id);
    } catch {
      alert('Failed to unsave.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={styles.card}>
      <div style={styles.topRow}>
        <span style={styles.category}>{product.category}</span>
        {product.gwpA1A3 != null && <span style={styles.epdBadge}>EPD</span>}
      </div>
      <Link to={`/product/${product.id}`} style={styles.name}>{product.name}</Link>
      <Link to={`/manufacturer/${product.manufacturerId}`} style={styles.manufacturer}>
        {product.manufacturerName}
      </Link>
      <div style={styles.material}>{product.material}</div>
      {product.fireRating && <div style={styles.fireRating}>{product.fireRating}</div>}
      <div style={styles.footer}>
        {user?.role === 'Architect' && (
          savedId
            ? <button onClick={handleUnsave} disabled={busy} style={styles.savedBtn}>Saved ✓</button>
            : <button onClick={handleSave}   disabled={busy} style={styles.saveBtn}>Save</button>
        )}
      </div>
    </div>
  );
}

ProductCard.propTypes = {
  product: PropTypes.shape({
    id: PropTypes.number.isRequired,
    category: PropTypes.string,
    name: PropTypes.string.isRequired,
    manufacturerId: PropTypes.number,
    manufacturerName: PropTypes.string,
    material: PropTypes.string,
    fireRating: PropTypes.string,
    gwpA1A3: PropTypes.number,
  }).isRequired,
  savedId: PropTypes.number,
  onSaved: PropTypes.func,
  onUnsaved: PropTypes.func,
};

const styles = {
  card:         { border: '1px solid #9a9790', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', background: '#d4d0c8', padding: '14px', display: 'flex', flexDirection: 'column', gap: '5px' },
  topRow:       { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  category:     { fontSize: '0.72rem', color: '#808080', textTransform: 'uppercase', letterSpacing: '0.06em' },
  epdBadge:     { fontSize: '0.65rem', background: '#e8f5e9', color: '#2e7d32', padding: '1px 5px', fontWeight: 700, border: '1px solid #2e7d32' },
  name:         { margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#000000', textDecoration: 'none', display: 'block', lineHeight: 1.3 },
  manufacturer: { fontSize: '0.82rem', color: '#000080', textDecoration: 'none' },
  material:     { fontSize: '0.8rem', color: '#404040' },
  fireRating:   { fontSize: '0.75rem', color: '#000000', background: '#d4d0c8', display: 'inline-block', padding: '1px 6px', fontWeight: 700, border: '1px solid #808080' },
  footer:       { marginTop: '6px', display: 'flex', justifyContent: 'flex-end' },
  saveBtn:      { borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#000080', color: '#ffffff', padding: '3px 12px', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'inherit' },
  savedBtn:     { borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#d4d0c8', color: '#2e7d32', padding: '3px 12px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, fontFamily: 'inherit' },
};
