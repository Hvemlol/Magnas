import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import api from '../services/api';

/**
 * Two modes:
 * • Product-first (Browse / ProductDetail): props = { productId, productName, onClose, onAdded? }
 *   → User selects which project (and optional group) to add this product to.
 * • Project-first (ProjectDetail): props = { projectId, projectGroups, onClose, onAdded? }
 *   → User searches for a product to add to the current project.
 */
export default function AddToProjectModal({
  // product-first mode
  productId, productName,
  // project-first mode
  projectId, projectGroups,
  // shared
  onClose, onAdded,
}) {
  const isProductFirst = !!productId;

  // ── Product-first state ──────────────────────────────────────
  const [projects, setProjects]         = useState([]);
  const [selProjectId, setSelProjectId] = useState('');
  const [selGroups, setSelGroups]       = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  // ── Project-first state ──────────────────────────────────────
  const [search, setSearch]             = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching]       = useState(false);
  const [selProduct, setSelProduct]     = useState(null);

  // ── Shared state ─────────────────────────────────────────────
  const [selGroupId, setSelGroupId]     = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [success, setSuccess]           = useState('');
  const [error, setError]               = useState('');

  // Load projects list (product-first mode)
  useEffect(() => {
    if (isProductFirst) {
      api.get('/projects').then(res => setProjects(res.data)).catch(() => {});
    }
  }, [isProductFirst]);

  // When project is selected (product-first), load its groups
  useEffect(() => {
    if (!isProductFirst || !selProjectId) { setSelGroups([]); return; }
    setLoadingGroups(true);
    api.get(`/projects/${selProjectId}`)
      .then(res => setSelGroups(res.data.groups ?? []))
      .catch(() => setSelGroups([]))
      .finally(() => setLoadingGroups(false));
  }, [selProjectId, isProductFirst]);

  // Product search with debounce (project-first mode)
  useEffect(() => {
    if (isProductFirst || !search.trim()) { setSearchResults([]); return; }
    const t = setTimeout(() => {
      setSearching(true);
      api.get(`/products?search=${encodeURIComponent(search.trim())}`)
        .then(res => setSearchResults((res.data ?? []).slice(0, 8)))
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [search, isProductFirst]);

  async function handleSubmit() {
    const pid   = isProductFirst ? productId        : selProduct?.id;
    const projId = isProductFirst ? parseInt(selProjectId) : projectId;
    if (!pid || !projId) return;

    setSubmitting(true);
    setError('');
    try {
      await api.post(`/projects/${projId}/products`, {
        productId: pid,
        groupId:   selGroupId ? parseInt(selGroupId) : null,
      });
      const name = isProductFirst ? productName : selProduct?.name;
      setSuccess(`"${name}" added successfully.`);
      // Reset for another add
      if (isProductFirst) {
        setSelProjectId('');
        setSelGroupId('');
        setSelGroups([]);
      } else {
        setSelProduct(null);
        setSearch('');
        setSearchResults([]);
        setSelGroupId('');
      }
      if (onAdded) onAdded();
    } catch (err) {
      setError(err.response?.data?.error ?? 'Failed to add product.');
    } finally {
      setSubmitting(false);
    }
  }

  const groups    = isProductFirst ? selGroups : (projectGroups ?? []);
  const canSubmit = isProductFirst ? (!!selProjectId && !submitting) : (!!selProduct && !submitting);

  return (
    <>
      <div style={s.backdrop} onClick={onClose} />
      <div style={s.modal}>

        {/* Header */}
        <div style={s.header}>
          <div style={s.title}>
            {isProductFirst ? `Add "${productName}" to a project` : 'Add product to project'}
          </div>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div style={s.body}>
          {success && <div style={s.success}>{success}</div>}
          {error   && <div style={s.error}>{error}</div>}

          {isProductFirst ? (
            /* ── Pick a project ── */
            <>
              <div style={s.field}>
                <label style={s.label}>Project</label>
                {projects.length === 0
                  ? <p style={s.hint}>No projects yet. Create one on the Projects page first.</p>
                  : <select
                      style={s.select}
                      value={selProjectId}
                      onChange={e => { setSelProjectId(e.target.value); setSelGroupId(''); setSuccess(''); setError(''); }}
                    >
                      <option value="">— Select a project —</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name}{p.location ? ` (${p.location})` : ''}
                        </option>
                      ))}
                    </select>
                }
              </div>

              {selProjectId && (
                <div style={s.field}>
                  <label style={s.label}>Subgroup (optional)</label>
                  {loadingGroups
                    ? <span style={s.muted}>Loading groups…</span>
                    : selGroups.length === 0
                      ? <span style={s.muted}>No subgroups in this project.</span>
                      : <select style={s.select} value={selGroupId} onChange={e => setSelGroupId(e.target.value)}>
                          <option value="">Ungrouped</option>
                          {selGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                  }
                </div>
              )}
            </>
          ) : (
            /* ── Search for a product ── */
            <>
              <div style={s.field}>
                <label style={s.label}>Search for a product</label>
                {selProduct ? (
                  <div style={s.selectedProduct}>
                    <div style={s.selectedInfo}>
                      <span style={s.selectedName}>{selProduct.name}</span>
                      <span style={s.selectedMeta}>{selProduct.category} · {selProduct.manufacturerName}</span>
                    </div>
                    <button style={s.clearSel} onClick={() => { setSelProduct(null); setSearch(''); setSuccess(''); setError(''); }}>
                      Change
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      style={s.input}
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Type to search products…"
                      autoFocus
                    />
                    {searching && <span style={s.muted}>Searching…</span>}
                    {!searching && search.trim() && searchResults.length === 0 && (
                      <span style={s.muted}>No products found.</span>
                    )}
                    {searchResults.length > 0 && (
                      <div style={s.results}>
                        {searchResults.map(p => (
                          <button
                            key={p.id}
                            style={s.resultItem}
                            onClick={() => { setSelProduct(p); setSearchResults([]); setSearch(''); }}
                          >
                            <span style={s.resultName}>{p.name}</span>
                            <span style={s.resultMeta}>{p.category} · {p.manufacturerName}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {selProduct && groups.length > 0 && (
                <div style={s.field}>
                  <label style={s.label}>Subgroup (optional)</label>
                  <select style={s.select} value={selGroupId} onChange={e => setSelGroupId(e.target.value)}>
                    <option value="">Ungrouped</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={s.footer}>
          <button style={s.cancelBtn} onClick={onClose}>Close</button>
          <button
            style={{ ...s.addBtn, opacity: canSubmit ? 1 : 0.45, cursor: canSubmit ? 'pointer' : 'default' }}
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {submitting ? 'Adding…' : 'Add to project'}
          </button>
        </div>

      </div>
    </>
  );
}

AddToProjectModal.propTypes = {
  productId: PropTypes.number,
  productName: PropTypes.string,
  projectId: PropTypes.number,
  projectGroups: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
  })),
  onClose: PropTypes.func.isRequired,
  onAdded: PropTypes.func,
};

const s = {
  backdrop:      { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 },
  modal:         { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#d4d0c8', border: '1px solid #9a9790', boxShadow: '0 4px 16px rgba(0,0,0,0.35)', zIndex: 201, width: '480px', maxWidth: '95vw', display: 'flex', flexDirection: 'column', maxHeight: '90vh' },
  header:        { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 6px', background: 'linear-gradient(90deg, #000080 0%, #1084d0 100%)', flexShrink: 0 },
  title:         { fontWeight: 700, fontSize: '0.88rem', color: '#ffffff', paddingRight: '10px', letterSpacing: '0.01em' },
  closeBtn:      { borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#d4d0c8', cursor: 'pointer', color: '#000000', fontSize: '0.8rem', padding: '0px 5px', lineHeight: '16px', flexShrink: 0, fontFamily: 'inherit' },
  body:          { padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' },
  footer:        { display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '10px 16px', borderTop: '1px solid #808080', flexShrink: 0 },

  field:         { display: 'flex', flexDirection: 'column', gap: '4px' },
  label:         { fontSize: '0.78rem', fontWeight: 700, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.04em' },
  select:        { border: '1px solid #9a9790', background: '#ffffff', color: '#000000', padding: '4px 8px', fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit', outline: 'none' },
  input:         { border: '1px solid #9a9790', background: '#ffffff', color: '#000000', padding: '4px 8px', fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit' },
  muted:         { fontSize: '0.82rem', color: '#808080' },
  hint:          { fontSize: '0.85rem', color: '#808080', margin: 0 },

  results:       { border: '1px solid #9a9790', overflow: 'hidden', maxHeight: '220px', overflowY: 'auto', background: '#ffffff' },
  resultItem:    { display: 'flex', flexDirection: 'column', gap: '2px', width: '100%', padding: '7px 10px', background: 'none', border: 'none', borderBottom: '1px solid #e0ddd4', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' },
  resultName:    { fontWeight: 700, fontSize: '0.88rem', color: '#000000' },
  resultMeta:    { fontSize: '0.75rem', color: '#808080' },

  selectedProduct: { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', border: '1px solid #9a9790', background: '#ffffff' },
  selectedInfo:    { display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 },
  selectedName:    { fontWeight: 700, fontSize: '0.88rem', color: '#000000' },
  selectedMeta:    { fontSize: '0.75rem', color: '#808080' },
  clearSel:        { background: 'none', border: 'none', cursor: 'pointer', color: '#000080', fontSize: '0.78rem', textDecoration: 'underline', padding: 0, flexShrink: 0, fontFamily: 'inherit' },

  success:       { background: '#e8f5e9', color: '#2e7d32', padding: '8px 12px', border: '1px solid #2e7d32', fontSize: '0.85rem', fontWeight: 700 },
  error:         { background: '#ffe0e0', color: '#c00000', padding: '8px 12px', border: '1px solid #c00000', fontSize: '0.85rem' },

  cancelBtn:     { padding: '5px 16px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#d4d0c8', color: '#000000', cursor: 'pointer', fontSize: '0.88rem', fontFamily: 'inherit' },
  addBtn:        { padding: '5px 16px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#000080', color: '#ffffff', fontWeight: 700, fontSize: '0.88rem', fontFamily: 'inherit' },
};
