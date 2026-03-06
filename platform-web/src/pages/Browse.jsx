import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Fuse from 'fuse.js';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import AddToProjectModal from '../components/AddToProjectModal';
import { fireRatingColour } from '../utils/colours';

const COLS = [
  { key: 'name',             label: 'Product name' },
  { key: 'category',         label: 'Category' },
  { key: 'material',         label: 'Material' },
  { key: 'manufacturerName', label: 'Manufacturer' },
  { key: 'fireRating',       label: 'Fire rating' },
];

export default function Browse() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const [allProducts, setAllProducts] = useState([]);
  const [saved, setSaved]             = useState({});
  const [loading, setLoading]         = useState(true);
  const [loadError, setLoadError]     = useState('');
  const [busyId, setBusyId]           = useState(null);
  const [modalProduct, setModalProduct] = useState(null); // product to add to a project

  // Filter state (URL-synced)
  const [search,   setSearch]   = useState(searchParams.get('q')   || '');
  const [category, setCategory] = useState(searchParams.get('cat') || '');
  const [epdOnly,  setEpdOnly]  = useState(searchParams.get('epd') === '1');
  const [selectedCerts, setSelectedCerts] = useState(() => {
    const raw = searchParams.get('certs');
    return raw ? raw.split(',').filter(Boolean) : [];
  });

  // Table sort state — col key + direction
  const [sortCol, setSortCol] = useState(searchParams.get('scol') || 'name');
  const [sortDir, setSortDir] = useState(searchParams.get('sdir') || 'asc');

  // Sync URL
  useEffect(() => {
    const p = {};
    if (search)                  p.q     = search;
    if (category)                p.cat   = category;
    if (epdOnly)                 p.epd   = '1';
    if (selectedCerts.length)    p.certs = selectedCerts.join(',');
    if (sortCol !== 'name')      p.scol  = sortCol;
    if (sortDir !== 'asc')       p.sdir  = sortDir;
    setSearchParams(p, { replace: true });
  }, [search, category, epdOnly, selectedCerts, sortCol, sortDir]);

  // Load products
  useEffect(() => {
    api.get('/products')
      .then(res => setAllProducts(res.data))
      .catch(() => setLoadError('Failed to load products. Please refresh the page.'))
      .finally(() => setLoading(false));
  }, []);

  // Load saved (architects only)
  useEffect(() => {
    if (user?.role === 'Architect') {
      api.get('/saved')
        .then(res => {
          const map = {};
          res.data.forEach(s => { map[s.product.id] = s.savedId; });
          setSaved(map);
        })
        .catch(() => console.error('Failed to load saved product status.'));
    }
  }, [user]);

  // Derived: category list
  const categories = useMemo(() =>
    [...new Set(allProducts.map(p => p.category).filter(Boolean))].sort(),
    [allProducts]
  );

  // Derived: unique certification tokens across all products
  const certTokens = useMemo(() => {
    const tokens = new Set();
    allProducts.forEach(p => {
      if (p.certifications) {
        p.certifications.split(',').forEach(t => {
          const trimmed = t.trim();
          if (trimmed) tokens.add(trimmed);
        });
      }
    });
    return [...tokens].sort();
  }, [allProducts]);

  // Fuse instance
  const fuse = useMemo(() => new Fuse(allProducts, {
    keys: [
      { name: 'name',             weight: 0.35 },
      { name: 'category',         weight: 0.15 },
      { name: 'material',         weight: 0.15 },
      { name: 'manufacturerName', weight: 0.10 },
      { name: 'fireRating',       weight: 0.10 },
      { name: 'certifications',   weight: 0.10 },
      { name: 'description',      weight: 0.05 },
    ],
    threshold: 0.35,
    includeScore: true,
    ignoreLocation: true,
  }), [allProducts]);

  // Filter + sort
  const products = useMemo(() => {
    let results = search.trim()
      ? fuse.search(search.trim()).map(r => r.item)
      : [...allProducts];

    if (category) results = results.filter(p => p.category === category);
    if (epdOnly)  results = results.filter(p =>
      p.gwpA1A3 != null || p.gwpB4 != null || p.gwpB6 != null || p.gwpC3 != null || p.gwpC4 != null || p.epdUrl);
    if (selectedCerts.length) results = results.filter(p =>
      selectedCerts.every(cert =>
        p.certifications?.split(',').map(t => t.trim()).includes(cert)
      )
    );

    return [...results].sort((a, b) => {
      let av = String(a[sortCol] ?? '').toLowerCase();
      let bv = String(b[sortCol] ?? '').toLowerCase();
      const cmp = av.localeCompare(bv);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [allProducts, fuse, search, category, epdOnly, selectedCerts, sortCol, sortDir]);

  function handleColClick(key) {
    if (sortCol === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(key);
      setSortDir('asc');
    }
  }

  async function handleSave(product) {
    setBusyId(product.id);
    try {
      const res = await api.post('/saved', { productId: product.id });
      setSaved(s => ({ ...s, [product.id]: res.data.id }));
    } catch (e) {
      alert(e.response?.data?.error ?? 'Failed to save.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleUnsave(product) {
    setBusyId(product.id);
    try {
      await api.delete(`/saved/${saved[product.id]}`);
      setSaved(s => { const n = { ...s }; delete n[product.id]; return n; });
    } catch {
      alert('Failed to unsave.');
    } finally {
      setBusyId(null);
    }
  }

  const isFiltered = search || category || epdOnly || selectedCerts.length > 0;

  function clearAll() {
    setSearch(''); setCategory(''); setEpdOnly(false); setSelectedCerts([]);
  }

  function toggleCert(cert) {
    setSelectedCerts(prev =>
      prev.includes(cert) ? prev.filter(c => c !== cert) : [...prev, cert]
    );
  }

  function SortIcon({ col }) {
    if (sortCol !== col) return <span style={s.sortIconInactive}>↕</span>;
    return <span style={s.sortIconActive}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  return (
    <div style={s.page}>

      {/* Search bar */}
      <div style={s.searchWrap}>
        <input
          style={s.searchInput}
          placeholder="Search products, materials, manufacturers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoComplete="off"
        />
        {search && (
          <button style={s.clearInput} onClick={() => setSearch('')}>✕</button>
        )}
      </div>

      <div style={s.layout}>

        {/* ── Sidebar ── */}
        <aside style={s.sidebar}>

          <div style={s.sideSection}>
            <div style={s.sideHeading}>Category</div>
            <ul style={s.catList}>
              <li>
                <button
                  style={!category ? s.catItemActive : s.catItem}
                  onClick={() => setCategory('')}
                >
                  All categories
                  <span style={!category ? s.catCountActive : s.catCount}>{allProducts.length}</span>
                </button>
              </li>
              {categories.map(c => {
                const cnt = allProducts.filter(p => p.category === c).length;
                return (
                  <li key={c}>
                    <button
                      style={category === c ? s.catItemActive : s.catItem}
                      onClick={() => setCategory(category === c ? '' : c)}
                    >
                      {c}
                      <span style={category === c ? s.catCountActive : s.catCount}>{cnt}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div style={s.sideSection}>
            <div style={s.sideHeading}>Documentation</div>
            <label style={s.checkLabel}>
              <input
                type="checkbox"
                checked={epdOnly}
                onChange={e => setEpdOnly(e.target.checked)}
                style={s.checkbox}
              />
              EPD available
            </label>
          </div>

          {certTokens.length > 0 && (
            <div style={s.sideSection}>
              <div style={s.sideHeading}>Certifications</div>
              <div style={s.certList}>
                {certTokens.map(cert => {
                  const active = selectedCerts.includes(cert);
                  return (
                    <button
                      key={cert}
                      style={active ? s.certPillActive : s.certPill}
                      onClick={() => toggleCert(cert)}
                    >
                      {cert}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {isFiltered && (
            <button style={s.clearAllBtn} onClick={clearAll}>Clear all filters</button>
          )}

        </aside>

        {/* ── Main table area ── */}
        <main style={s.main}>

          {/* Results bar */}
          <div style={s.resultsBar}>
            <span style={s.resultCount}>
              {loading ? 'Loading...' : (
                isFiltered
                  ? `${products.length} of ${allProducts.length} results`
                  : `${allProducts.length} product${allProducts.length !== 1 ? 's' : ''}`
              )}
            </span>
          </div>

          {/* States */}
          {!loading && loadError && (
            <p style={s.loadError}>{loadError}</p>
          )}
          {!loading && !loadError && allProducts.length === 0 && (
            <p style={s.msg}>No products available yet.</p>
          )}
          {!loading && allProducts.length > 0 && products.length === 0 && (
            <div style={s.noResults}>
              <p>No products match your search.</p>
              <button style={s.noResultsBtn} onClick={clearAll}>Clear filters</button>
            </div>
          )}

          {/* Table */}
          {!loading && products.length > 0 && (
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr>
                    {COLS.map(col => (
                      <th
                        key={col.key}
                        style={col.key === 'price' ? { ...s.th, ...s.thRight } : s.th}
                        onClick={() => handleColClick(col.key)}
                      >
                        <span style={s.thInner}>
                          {col.label}
                          <SortIcon col={col.key} />
                        </span>
                      </th>
                    ))}
                    {user?.role === 'Architect' && (
                      <th style={{ ...s.th, width: '160px' }} />
                    )}
                  </tr>
                </thead>
                <tbody>
                  {products.map((p, i) => {
                    const fc = p.fireRating ? fireRatingColour(p.fireRating) : null;
                    return (
                      <tr key={p.id} style={i % 2 === 0 ? s.rowEven : s.rowOdd}>
                        <td style={s.tdName}>
                          <Link to={`/product/${p.id}`} style={s.productLink}>{p.name}</Link>
                          {p.gwpA1A3 != null && (
                            <span style={s.epdDot} title={`EPD available · GWP: ${p.gwpA1A3} kg CO₂ eq`}>EPD</span>
                          )}
                        </td>
                        <td style={s.td}>
                          <span style={s.categoryChip}>{p.category}</span>
                        </td>
                        <td style={s.td}>{p.material}</td>
                        <td style={s.td}>
                          <Link to={`/manufacturer/${p.manufacturerId}`} style={s.mfrLink}>
                            {p.manufacturerName}
                          </Link>
                        </td>
                        <td style={s.td}>
                          {fc
                            ? <span style={{ ...s.fireChip, color: fc.text, background: fc.bg }}>{p.fireRating}</span>
                            : <span style={s.noData}>—</span>}
                        </td>
                        {user?.role === 'Architect' && (
                          <td style={s.tdAction}>
                            <div style={s.actionGroup}>
                              {saved[p.id]
                                ? <button style={s.savedBtn} disabled={busyId === p.id} onClick={() => handleUnsave(p)}>✓ Saved</button>
                                : <button style={s.saveBtn}  disabled={busyId === p.id} onClick={() => handleSave(p)}>Save</button>
                              }
                              <button style={s.addProjectBtn} onClick={() => setModalProduct(p)} title="Add to project">+ Project</button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </main>
      </div>

      {modalProduct && (
        <AddToProjectModal
          productId={modalProduct.id}
          productName={modalProduct.name}
          onClose={() => setModalProduct(null)}
        />
      )}
    </div>
  );
}

const s = {
  page:            { padding: '20px', maxWidth: '1200px', margin: '0 auto' },

  // Search
  searchWrap:      { position: 'relative', display: 'flex', alignItems: 'center', marginBottom: '16px' },
  searchInput:     { width: '100%', border: '1px solid #9a9790', background: '#ffffff', padding: '7px 36px 7px 10px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  clearInput:      { position: 'absolute', right: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#808080', fontSize: '0.85rem', padding: '2px', fontFamily: 'inherit' },

  // Layout
  layout:          { display: 'grid', gridTemplateColumns: '220px 1fr', gap: '16px', alignItems: 'start' },

  // Sidebar
  sidebar:         { border: '1px solid #9a9790', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', background: '#d4d0c8', padding: '12px', position: 'sticky', top: '60px' },
  sideSection:     { marginBottom: '16px' },
  sideHeading:     { fontSize: '0.73rem', fontWeight: 700, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', borderBottom: '1px solid #9a9790', paddingBottom: '3px' },

  // Category list
  catList:         { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '1px' },
  catItem:         { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '4px 6px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.85rem', color: '#000000', textAlign: 'left', fontFamily: 'inherit' },
  catItemActive:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '4px 6px', border: 'none', background: '#000080', cursor: 'pointer', fontSize: '0.85rem', color: '#ffffff', fontWeight: 700, textAlign: 'left', fontFamily: 'inherit' },
  catCount:        { fontSize: '0.72rem', color: '#808080', padding: '0 4px' },
  catCountActive:  { fontSize: '0.72rem', color: '#ffffff', padding: '0 4px' },

  // Certification pills
  certList:        { display: 'flex', flexWrap: 'wrap', gap: '4px' },
  certPill:        { padding: '2px 7px', border: '1px solid #9a9790', background: '#d4d0c8', cursor: 'pointer', fontSize: '0.75rem', color: '#000000', fontFamily: 'inherit' },
  certPillActive:  { padding: '2px 7px', border: '1px solid #000060', background: '#000080', cursor: 'pointer', fontSize: '0.75rem', color: '#ffffff', fontWeight: 700, fontFamily: 'inherit' },
  clearAllBtn:     { marginTop: '4px', width: '100%', padding: '5px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#d4d0c8', cursor: 'pointer', fontSize: '0.82rem', color: '#c62828', fontFamily: 'inherit' },

  // Main
  main:            { minWidth: 0 },
  resultsBar:      { display: 'flex', alignItems: 'center', marginBottom: '8px' },
  resultCount:     { fontSize: '0.82rem', color: '#808080' },
  msg:             { color: '#808080', marginTop: '40px', textAlign: 'center' },
  loadError:       { color: '#c00000', background: '#ffe0e0', border: '1px solid #c62828', padding: '10px 14px', marginTop: '20px', fontSize: '0.88rem' },
  noResults:       { textAlign: 'center', padding: '40px 0', color: '#808080' },
  noResultsBtn:    { marginTop: '10px', padding: '5px 16px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#d4d0c8', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit' },

  // Table
  tableWrap:       { overflowX: 'auto', border: '1px solid #9a9790' },
  table:           { width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' },

  // Header
  th:              { padding: '8px 12px', background: '#d4d0c8', borderBottom: '1px solid #9a9790', textAlign: 'left', fontWeight: 700, color: '#000000', fontSize: '0.8rem', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' },
  thRight:         { textAlign: 'right' },
  thInner:         { display: 'inline-flex', alignItems: 'center', gap: '4px' },
  sortIconActive:  { color: '#000000', fontSize: '0.7rem' },
  sortIconInactive:{ color: '#808080', fontSize: '0.7rem' },

  // Rows
  rowEven:         { background: '#ffffff' },
  rowOdd:          { background: '#f0f0f0' },

  // Cells
  td:              { padding: '8px 12px', borderBottom: '1px solid #c0c0c0', color: '#000000', verticalAlign: 'middle' },
  tdName:          { padding: '8px 12px', borderBottom: '1px solid #c0c0c0', color: '#000000', fontWeight: 700, verticalAlign: 'middle', maxWidth: '280px' },
  tdAction:        { padding: '5px 12px', borderBottom: '1px solid #c0c0c0', textAlign: 'right', verticalAlign: 'middle' },
  productLink:     { color: '#000080', textDecoration: 'none', fontWeight: 700, display: 'block' },
  epdDot:          { display: 'inline-block', marginLeft: '6px', fontSize: '0.65rem', background: '#e8f5e9', color: '#2e7d32', padding: '1px 5px', fontWeight: 700, verticalAlign: 'middle', border: '1px solid #2e7d32' },
  categoryChip:    { display: 'inline-block', background: '#d4d0c8', color: '#000000', padding: '1px 6px', fontSize: '0.78rem', fontWeight: 500, border: '1px solid #808080' },
  fireChip:        { display: 'inline-block', padding: '1px 6px', fontSize: '0.78rem', fontWeight: 700, border: '1px solid currentColor' },
  noData:          { color: '#808080' },
  mfrLink:         { color: '#000080', textDecoration: 'none', fontWeight: 500 },
  saveBtn:         { padding: '3px 10px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#000080', color: '#ffffff', cursor: 'pointer', fontSize: '0.78rem', whiteSpace: 'nowrap', fontFamily: 'inherit' },
  savedBtn:        { padding: '3px 10px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#d4d0c8', color: '#2e7d32', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap', fontFamily: 'inherit' },
  actionGroup:     { display: 'flex', gap: '4px', alignItems: 'center' },
  addProjectBtn:   { padding: '3px 8px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#d4d0c8', color: '#000000', cursor: 'pointer', fontSize: '0.75rem', whiteSpace: 'nowrap', fontFamily: 'inherit' },
  // Sidebar extras
  checkLabel:      { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#000000', cursor: 'pointer' },
  checkbox:        { width: '13px', height: '13px', cursor: 'pointer' },
};
