import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const BIM7AA = {
  0: 'Generiske objekter',
  1: 'Bygningsbasis',
  2: 'Primære bygningsdele',
  3: 'Kompletterende bygningsdele',
  4: 'Overfladebygningsdele',
  5: 'VVS- og Ventilationsanlæg',
  6: 'El- og mekaniske anlæg',
  7: 'Inventar og teknisk udstyr',
  8: 'Beplantning og belægning',
  9: 'Projektudstyr',
};

const BIM7AA_SUB = {
  '0.1': 'Generiske bygningsdele',
  '1.1': 'Fundering og terrændæk',
  '1.2': 'Kælder og sokkel',
  '2.1': 'Ydervægge',
  '2.2': 'Indervægge',
  '2.3': 'Dækkonstruktioner',
  '2.4': 'Tagkonstruktioner',
  '2.5': 'Søjler og dragere',
  '3.1': 'Vinduer og yderdøre',
  '3.2': 'Facadebeklædning',
  '3.3': 'Lofter og altaner',
  '4.1': 'Gulvbelægninger',
  '4.2': 'Vægbeklædninger',
  '4.3': 'Loftbeklædninger',
  '4.4': 'Facadebeklædninger',
  '5.1': 'Varmeanlæg',
  '5.2': 'Ventilationsanlæg',
  '5.3': 'Vand- og afløbsanlæg',
  '5.4': 'Køleanlæg',
  '6.1': 'Elinstallationer',
  '6.2': 'IT og svagstrømsanlæg',
  '6.3': 'Brand og sikringsanlæg',
  '7.1': 'Inventar og udstyr',
  '7.2': 'Løst inventar',
  '7.3': 'Teknisk udstyr',
  '8.1': 'Beplantning',
  '8.2': 'Hårde belægninger',
  '8.3': 'Udendørs udstyr',
  '9.1': 'Projektudstyr',
};

const STATUS_NAMES = { 1: 'Aktiv', 2: 'Under review', 3: 'Godkendt' };
const STATUS_MAP   = {
  1: { label: '1', color: '#1565c0', bg: '#e3f2fd' },
  2: { label: '2', color: '#e65100', bg: '#fff3e0' },
  3: { label: '3', color: '#2e7d32', bg: '#e8f5e9' },
};

function getSubcats(cat) {
  return Object.entries(BIM7AA_SUB)
    .filter(([k]) => k.startsWith(`${cat}.`))
    .map(([k, v]) => ({ code: k, label: v }));
}

function gwpColour(v) {
  if (v < 0)   return { color: '#2e7d32', bg: '#e8f5e9' };
  if (v < 50)  return { color: '#1565c0', bg: '#e3f2fd' };
  if (v < 150) return { color: '#e65100', bg: '#fff3e0' };
  return               { color: '#c62828', bg: '#ffebee' };
}

function relDate(dateStr) {
  const d = new Date(dateStr);
  const diff = Math.floor((Date.now() - d) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 30)  return `${diff}d ago`;
  if (diff < 365) return `${Math.floor(diff / 30)}mo ago`;
  return `${Math.floor(diff / 365)}y ago`;
}

function dash(v) {
  if (v == null || v === '') return <span style={{ color: '#ddd' }}>—</span>;
  return v;
}

function trunc(v, max = 22) {
  if (!v) return <span style={{ color: '#ddd' }}>—</span>;
  if (v.length > max) return <span title={v}>{v.slice(0, max)}…</span>;
  return v;
}

export default function Elements() {
  const navigate = useNavigate();
  const [elements, setElements] = useState([]);
  const [loading, setLoading]   = useState(true);

  // Filters
  const [filterCat, setFilterCat]             = useState(null);
  const [filterSub, setFilterSub]             = useState('');
  const [filterStatus, setFilterStatus]       = useState(null);   // null=all, 0=no status, 1/2/3
  const [filterEntreprise, setFilterEntreprise] = useState('');   // ''=all
  const [filterFireClass, setFilterFireClass]   = useState('');   // ''=all
  const [hasMaterials, setHasMaterials]       = useState(false);
  const [hasLca, setHasLca]                   = useState(false);
  const [search, setSearch]                   = useState('');

  // Sort
  const [sortCol, setSortCol] = useState('createdDate');
  const [sortDir, setSortDir] = useState('desc');

  // Create form
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState({
    name: '', description: '', bim7aaCategory: '2', bim7aaSubcategory: '',
    typeNumber: '', status: '',
  });
  const [formError, setFormError] = useState('');

  // Product search within create form
  const [formProdSearch, setFormProdSearch]       = useState('');
  const [formProdResults, setFormProdResults]     = useState([]);
  const [formProdSearching, setFormProdSearching] = useState(false);
  const [formSelProducts, setFormSelProducts]     = useState([]);

  // Expand / product preview
  const [expanded, setExpanded]         = useState(new Set());
  const [expandedData, setExpandedData] = useState({});

  // Technical properties column group toggle
  const [techOpen, setTechOpen] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try { setElements((await api.get('/elements')).data); }
    catch {}
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (!formProdSearch.trim()) { setFormProdResults([]); return; }
    const t = setTimeout(() => {
      setFormProdSearching(true);
      api.get(`/products?search=${encodeURIComponent(formProdSearch.trim())}`)
        .then(res => setFormProdResults((res.data ?? []).slice(0, 8)))
        .catch(() => {})
        .finally(() => setFormProdSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [formProdSearch]);

  function setF(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })); }

  function handleCategoryChange(e) {
    const cat = e.target.value;
    setForm(f => ({ ...f, bim7aaCategory: cat, bim7aaSubcategory: '' }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.name.trim()) { setFormError('Name is required.'); return; }
    setFormError('');
    try {
      const res = await api.post('/elements', {
        name:              form.name.trim(),
        description:       form.description.trim() || null,
        bim7aaCategory:    parseInt(form.bim7aaCategory),
        bim7aaSubcategory: form.bim7aaSubcategory || null,
        typeNumber:        form.typeNumber.trim() || null,
        status:            form.status ? parseInt(form.status) : null,
      });
      const newElement = res.data;
      // Attach any pre-selected products
      for (const p of formSelProducts) {
        try {
          await api.post(`/elements/${newElement.id}/products`, {
            productId: p.id,
            amount: p.amount !== '' ? parseFloat(p.amount) : null,
            unit: p.unit || null,
          });
        } catch {}
      }
      setElements(prev => [{ ...newElement, productCount: formSelProducts.length }, ...prev]);
      setForm({ name: '', description: '', bim7aaCategory: '2', bim7aaSubcategory: '', typeNumber: '', status: '' });
      setFormSelProducts([]);
      setFormProdSearch('');
      setFormProdResults([]);
      setShowForm(false);
    } catch (err) {
      setFormError(err.response?.data?.error ?? 'Failed to create element.');
    }
  }

  async function handleDelete(id, e) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Delete this element? This cannot be undone.')) return;
    try {
      await api.delete(`/elements/${id}`);
      setElements(prev => prev.filter(el => el.id !== id));
    } catch { alert('Failed to delete element.'); }
  }

  async function toggleExpand(id, e) {
    e.stopPropagation();
    if (expanded.has(id)) {
      setExpanded(prev => { const s = new Set(prev); s.delete(id); return s; });
      return;
    }
    if (!expandedData[id]) {
      try {
        const res = await api.get(`/elements/${id}`);
        setExpandedData(prev => ({ ...prev, [id]: res.data.products ?? [] }));
      } catch {
        setExpandedData(prev => ({ ...prev, [id]: [] }));
      }
    }
    setExpanded(prev => new Set([...prev, id]));
  }

  function toggleSort(col) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  }

  function clearFilters() {
    setFilterCat(null);
    setFilterSub('');
    setFilterStatus(null);
    setFilterEntreprise('');
    setFilterFireClass('');
    setHasMaterials(false);
    setHasLca(false);
    setSearch('');
  }

  const isFiltered = filterCat !== null || filterSub || filterStatus !== null ||
    filterEntreprise || filterFireClass || hasMaterials || hasLca || search.trim();

  const sidebarSubcats = filterCat !== null
    ? getSubcats(filterCat).filter(sc => elements.some(e => e.bim7aaSubcategory === sc.code))
    : [];

  // Dynamic filter option lists
  const entrepriseValues = useMemo(
    () => [...new Set(elements.map(e => e.entreprise).filter(Boolean))].sort(),
    [elements],
  );
  const fireClassValues = useMemo(
    () => [...new Set(elements.map(e => e.fireClass).filter(Boolean))].sort(),
    [elements],
  );

  const displayed = useMemo(() => {
    let list = elements;
    if (filterCat !== null)    list = list.filter(e => e.bim7aaCategory === filterCat);
    if (filterSub)             list = list.filter(e => e.bim7aaSubcategory === filterSub);
    if (filterStatus !== null) {
      if (filterStatus === 0)  list = list.filter(e => e.status == null);
      else                     list = list.filter(e => e.status === filterStatus);
    }
    if (filterEntreprise)      list = list.filter(e => e.entreprise === filterEntreprise);
    if (filterFireClass)       list = list.filter(e => e.fireClass === filterFireClass);
    if (hasMaterials)          list = list.filter(e => e.productCount > 0);
    if (hasLca)                list = list.filter(e => e.gwpSum != null);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(e =>
        e.name.toLowerCase().includes(q) ||
        (e.description          ?? '').toLowerCase().includes(q) ||
        (e.typeNumber           ?? '').toLowerCase().includes(q) ||
        (e.bim7aaSubcategory    ?? '').toLowerCase().includes(q) ||
        (BIM7AA[e.bim7aaCategory] ?? '').toLowerCase().includes(q) ||
        (e.buildingComponents   ?? '').toLowerCase().includes(q) ||
        (e.work                 ?? '').toLowerCase().includes(q) ||
        (e.entreprise           ?? '').toLowerCase().includes(q) ||
        (e.responsibility       ?? '').toLowerCase().includes(q) ||
        (e.workDescriptionNumber ?? '').toLowerCase().includes(q) ||
        (e.soundRequirement     ?? '').toLowerCase().includes(q) ||
        (e.fireClass            ?? '').toLowerCase().includes(q) ||
        (e.buildingPartAnalysis ?? '').toLowerCase().includes(q) ||
        (e.unit                 ?? '').toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      let av = a[sortCol], bv = b[sortCol];
      if (av == null) av = sortDir === 'asc' ? Infinity : -Infinity;
      if (bv == null) bv = sortDir === 'asc' ? Infinity : -Infinity;
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return list;
  }, [elements, filterCat, filterSub, filterStatus, filterEntreprise, filterFireClass,
      hasMaterials, hasLca, search, sortCol, sortDir]);

  const SortIcon = ({ col }) => {
    if (sortCol !== col) return <span style={s.sortInactive}>↕</span>;
    return <span style={s.sortActive}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const subcats = getSubcats(parseInt(form.bim7aaCategory));

  if (loading) return <div style={s.state}>Loading…</div>;

  return (
    <div style={s.page}>

      {/* Top bar */}
      <div style={s.topBar}>
        <div>
          <h1 style={s.heading}>My Elements</h1>
          <p style={s.sub}>Compositions of products — walls, slabs, finishes, and more.</p>
        </div>
        <button style={s.newBtn} onClick={() => { setShowForm(f => !f); setFormError(''); }}>
          {showForm ? 'Cancel' : '+ New element'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form style={s.formBox} onSubmit={handleCreate}>
          <div style={s.grid6}>
            <div style={s.field}>
              <label style={s.label}>Name *</label>
              <input style={s.input} value={form.name} onChange={setF('name')} placeholder="e.g. External Wall" autoFocus />
            </div>
            <div style={s.field}>
              <label style={s.label}>BIM7AA Category</label>
              <select style={s.input} value={form.bim7aaCategory} onChange={handleCategoryChange}>
                {Object.entries(BIM7AA).map(([k, v]) => (
                  <option key={k} value={k}>{k} – {v}</option>
                ))}
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Subcategory</label>
              <select
                style={s.input}
                value={form.bim7aaSubcategory}
                onChange={setF('bim7aaSubcategory')}
                disabled={subcats.length === 0}
              >
                <option value="">— None —</option>
                {subcats.map(sc => (
                  <option key={sc.code} value={sc.code}>{sc.code} – {sc.label}</option>
                ))}
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Type no.</label>
              <input style={s.input} value={form.typeNumber} onChange={setF('typeNumber')} placeholder="e.g. YV-01" />
            </div>
            <div style={s.field}>
              <label style={s.label}>Status</label>
              <select style={s.input} value={form.status} onChange={setF('status')}>
                <option value="">— None —</option>
                <option value="1">1 – Aktiv</option>
                <option value="2">2 – Under review</option>
                <option value="3">3 – Godkendt</option>
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Description</label>
              <input style={s.input} value={form.description} onChange={setF('description')} placeholder="Optional" />
            </div>
          </div>
          {/* Product search */}
          <div style={s.prodSection}>
            <div style={s.prodSectionLabel}>Add products</div>
            <div style={s.prodSearchRow}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  style={s.input}
                  value={formProdSearch}
                  onChange={e => setFormProdSearch(e.target.value)}
                  placeholder="Search products…"
                  autoComplete="off"
                />
                {formProdSearching && (
                  <span style={s.prodSearchHint}>Searching…</span>
                )}
              </div>
            </div>
            {formProdResults.length > 0 && (
              <div style={s.prodResults}>
                {formProdResults.map(p => {
                  const alreadyAdded = formSelProducts.some(sp => sp.id === p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={alreadyAdded}
                      style={alreadyAdded ? s.prodResultAdded : s.prodResult}
                      onClick={() => {
                        if (!alreadyAdded) {
                          setFormSelProducts(prev => [...prev, { ...p, amount: '', unit: 'stk' }]);
                          setFormProdSearch('');
                          setFormProdResults([]);
                        }
                      }}
                    >
                      <span style={s.prodResultName}>{p.name}</span>
                      {p.category && <span style={s.prodResultMeta}>{p.category}</span>}
                      {p.manufacturerName && <span style={s.prodResultMeta}>{p.manufacturerName}</span>}
                      {alreadyAdded && <span style={s.prodResultMeta}>✓ added</span>}
                    </button>
                  );
                })}
              </div>
            )}
            {formSelProducts.length > 0 && (
              <div style={s.prodList}>
                {formSelProducts.map(p => (
                  <div key={p.id} style={s.prodListRow}>
                    <span style={s.prodListName}>{p.name}</span>
                    {p.category && <span style={s.prodResultMeta}>{p.category}</span>}
                    <input
                      style={s.prodAmountInput}
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Amount"
                      value={p.amount}
                      onChange={e => setFormSelProducts(prev =>
                        prev.map(sp => sp.id === p.id ? { ...sp, amount: e.target.value } : sp)
                      )}
                    />
                    <select
                      style={s.prodUnitSelect}
                      value={p.unit}
                      onChange={e => setFormSelProducts(prev =>
                        prev.map(sp => sp.id === p.id ? { ...sp, unit: e.target.value } : sp)
                      )}
                    >
                      <option value="stk">stk</option>
                      <option value="m">m</option>
                      <option value="m2">m²</option>
                      <option value="mm">mm</option>
                      <option value="kg">kg</option>
                    </select>
                    <button
                      type="button"
                      style={s.prodListRemove}
                      onClick={() => setFormSelProducts(prev => prev.filter(sp => sp.id !== p.id))}
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {formError && <p style={s.err}>{formError}</p>}
          <div style={s.formBtns}>
            <button type="submit" style={s.submitBtn}>Create element</button>
            <button type="button" style={s.cancelBtn} onClick={() => {
              setShowForm(false);
              setFormSelProducts([]);
              setFormProdSearch('');
              setFormProdResults([]);
            }}>Cancel</button>
          </div>
        </form>
      )}

      {/* Two-column layout */}
      <div style={s.layout}>

        {/* ── Sidebar ── */}
        <aside style={s.sidebar}>

          {/* Search */}
          <div style={s.searchWrap}>
            <input
              style={s.searchInput}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search elements…"
              autoComplete="off"
            />
            {search && <button style={s.clearInput} onClick={() => setSearch('')}>✕</button>}
          </div>

          {/* BIM7AA Category */}
          <div style={s.sideSection}>
            <div style={s.sideHeading}>BIM7AA Kategori</div>
            <ul style={s.catList}>
              <li>
                <button
                  style={filterCat === null ? s.catItemActive : s.catItem}
                  onClick={() => { setFilterCat(null); setFilterSub(''); }}
                >
                  Alle kategorier
                  <span style={filterCat === null ? s.catCountActive : s.catCount}>{elements.length}</span>
                </button>
              </li>
              {Object.entries(BIM7AA).map(([k, v]) => {
                const count = elements.filter(e => e.bim7aaCategory === parseInt(k)).length;
                if (count === 0) return null;
                const active = filterCat === parseInt(k);
                return (
                  <li key={k}>
                    <button
                      style={active ? s.catItemActive : s.catItem}
                      onClick={() => {
                        const next = parseInt(k);
                        setFilterCat(filterCat === next ? null : next);
                        setFilterSub('');
                      }}
                    >
                      <span style={s.catLabelWrap}>
                        <span style={active ? s.catNumActive : s.catNumBadge}>{k}</span>
                        {v}
                      </span>
                      <span style={active ? s.catCountActive : s.catCount}>{count}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Subcategory */}
          {sidebarSubcats.length > 0 && (
            <div style={s.sideSection}>
              <div style={s.sideHeading}>Underkategori</div>
              <ul style={s.catList}>
                <li>
                  <button
                    style={filterSub === '' ? s.catItemActive : s.catItem}
                    onClick={() => setFilterSub('')}
                  >
                    Alle
                    <span style={filterSub === '' ? s.catCountActive : s.catCount}>
                      {elements.filter(e => e.bim7aaCategory === filterCat).length}
                    </span>
                  </button>
                </li>
                {sidebarSubcats.map(sc => {
                  const count = elements.filter(e => e.bim7aaSubcategory === sc.code).length;
                  const active = filterSub === sc.code;
                  return (
                    <li key={sc.code}>
                      <button
                        style={active ? s.catItemActive : s.catItem}
                        onClick={() => setFilterSub(filterSub === sc.code ? '' : sc.code)}
                      >
                        <span style={s.catLabelWrap}>
                          <span style={active ? s.catNumActive : s.catNumBadge}>{sc.code}</span>
                          {sc.label}
                        </span>
                        <span style={active ? s.catCountActive : s.catCount}>{count}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Status */}
          <div style={s.sideSection}>
            <div style={s.sideHeading}>Status</div>
            <ul style={s.catList}>
              <li>
                <button
                  style={filterStatus === null ? s.catItemActive : s.catItem}
                  onClick={() => setFilterStatus(null)}
                >
                  Alle
                  <span style={filterStatus === null ? s.catCountActive : s.catCount}>{elements.length}</span>
                </button>
              </li>
              {[1, 2, 3].map(sv => {
                const count = elements.filter(e => e.status === sv).length;
                if (count === 0) return null;
                const active = filterStatus === sv;
                const st = STATUS_MAP[sv];
                return (
                  <li key={sv}>
                    <button
                      style={active ? s.catItemActive : s.catItem}
                      onClick={() => setFilterStatus(filterStatus === sv ? null : sv)}
                    >
                      <span style={s.catLabelWrap}>
                        <span style={{
                          ...( active ? s.catNumActive : s.catNumBadge ),
                          background: active ? 'rgba(255,255,255,0.2)' : st.bg,
                          color: active ? '#ffffff' : st.color,
                        }}>{sv}</span>
                        {STATUS_NAMES[sv]}
                      </span>
                      <span style={active ? s.catCountActive : s.catCount}>{count}</span>
                    </button>
                  </li>
                );
              })}
              {elements.some(e => e.status == null) && (
                <li>
                  <button
                    style={filterStatus === 0 ? s.catItemActive : s.catItem}
                    onClick={() => setFilterStatus(filterStatus === 0 ? null : 0)}
                  >
                    <span style={s.catLabelWrap}>
                      <span style={filterStatus === 0 ? s.catNumActive : s.catNumBadge}>—</span>
                      Ingen status
                    </span>
                    <span style={filterStatus === 0 ? s.catCountActive : s.catCount}>
                      {elements.filter(e => e.status == null).length}
                    </span>
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* Entreprise */}
          {entrepriseValues.length > 0 && (
            <div style={s.sideSection}>
              <div style={s.sideHeading}>Entreprise</div>
              <ul style={s.catList}>
                <li>
                  <button
                    style={filterEntreprise === '' ? s.catItemActive : s.catItem}
                    onClick={() => setFilterEntreprise('')}
                  >
                    Alle
                    <span style={filterEntreprise === '' ? s.catCountActive : s.catCount}>{elements.length}</span>
                  </button>
                </li>
                {entrepriseValues.map(val => {
                  const count  = elements.filter(e => e.entreprise === val).length;
                  const active = filterEntreprise === val;
                  return (
                    <li key={val}>
                      <button
                        style={active ? s.catItemActive : s.catItem}
                        onClick={() => setFilterEntreprise(filterEntreprise === val ? '' : val)}
                        title={val}
                      >
                        <span style={{ ...s.catLabelWrap, overflow: 'hidden' }}>
                          {val.length > 20 ? val.slice(0, 20) + '…' : val}
                        </span>
                        <span style={active ? s.catCountActive : s.catCount}>{count}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Fire class */}
          {fireClassValues.length > 0 && (
            <div style={s.sideSection}>
              <div style={s.sideHeading}>Brandklasse</div>
              <ul style={s.catList}>
                <li>
                  <button
                    style={filterFireClass === '' ? s.catItemActive : s.catItem}
                    onClick={() => setFilterFireClass('')}
                  >
                    Alle
                    <span style={filterFireClass === '' ? s.catCountActive : s.catCount}>{elements.length}</span>
                  </button>
                </li>
                {fireClassValues.map(val => {
                  const count  = elements.filter(e => e.fireClass === val).length;
                  const active = filterFireClass === val;
                  return (
                    <li key={val}>
                      <button
                        style={active ? s.catItemActive : s.catItem}
                        onClick={() => setFilterFireClass(filterFireClass === val ? '' : val)}
                      >
                        <span style={s.catLabelWrap}>{val}</span>
                        <span style={active ? s.catCountActive : s.catCount}>{count}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Materialer / LCA */}
          <div style={s.sideSection}>
            <div style={s.sideHeading}>Data</div>
            <label style={s.checkLabel}>
              <input
                type="checkbox"
                checked={hasMaterials}
                onChange={e => setHasMaterials(e.target.checked)}
                style={s.checkbox}
              />
              Har materialer
            </label>
            <label style={{ ...s.checkLabel, marginTop: '6px' }}>
              <input
                type="checkbox"
                checked={hasLca}
                onChange={e => setHasLca(e.target.checked)}
                style={s.checkbox}
              />
              Har LCA-data
            </label>
          </div>

          {isFiltered && (
            <button style={s.clearAllBtn} onClick={clearFilters}>Ryd alle filtre</button>
          )}

        </aside>

        {/* ── Main content ── */}
        <main style={s.main}>

          {/* Results bar */}
          {elements.length > 0 && (
            <div style={s.resultsBar}>
              <span style={s.resultCount}>
                {isFiltered
                  ? `${displayed.length} af ${elements.length} element${elements.length !== 1 ? 'er' : ''}`
                  : `${elements.length} element${elements.length !== 1 ? 'er' : ''}`}
              </span>
            </div>
          )}

          {/* Empty states */}
          {elements.length === 0 ? (
            <div style={s.empty}>
              <p style={s.emptyTitle}>No elements yet</p>
              <p style={s.emptySub}>Create your first element to start building assemblies.</p>
              <button style={s.newBtn} onClick={() => setShowForm(true)}>+ New element</button>
            </div>
          ) : displayed.length === 0 ? (
            <div style={s.empty}>
              <p style={s.emptyTitle}>No elements match this filter</p>
              <button style={s.noResultsBtn} onClick={clearFilters}>Clear filters</button>
            </div>
          ) : (
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  {/* Row 1: column group headers — non-tech cols use rowSpan=2 */}
                  <tr>
                    <th rowSpan={2} style={{ ...s.th, width: '44px', textAlign: 'center', cursor: 'pointer' }} onClick={() => toggleSort('bim7aaCategory')}>
                      Kat. <SortIcon col="bim7aaCategory" />
                    </th>
                    <th rowSpan={2} style={{ ...s.th, width: '130px', cursor: 'pointer' }} onClick={() => toggleSort('bim7aaSubcategory')}>
                      Kategori <SortIcon col="bim7aaSubcategory" />
                    </th>
                    <th rowSpan={2} style={{ ...s.th, width: '90px', cursor: 'pointer' }} onClick={() => toggleSort('typeNumber')}>
                      Typenr. <SortIcon col="typeNumber" />
                    </th>
                    <th rowSpan={2} style={{ ...s.th, width: '180px', cursor: 'pointer' }} onClick={() => toggleSort('name')}>
                      Objektnavn <SortIcon col="name" />
                    </th>
                    <th rowSpan={2} style={{ ...s.th, width: '148px' }}>Komponenter</th>
                    <th rowSpan={2} style={{ ...s.th, width: '96px', cursor: 'pointer' }} onClick={() => toggleSort('createdByUsername')}>
                      Oprettet af <SortIcon col="createdByUsername" />
                    </th>
                    {/* Tekniske egenskaber group — always same cell, click toggles expansion */}
                    <th
                      colSpan={techOpen ? 5 : 1}
                      style={{ ...s.thGroup, width: techOpen ? undefined : '110px', cursor: 'pointer' }}
                      onClick={() => setTechOpen(t => !t)}
                    >
                      Tekniske egenskaber {techOpen ? '▼' : '▶'}
                    </th>
                    <th rowSpan={2} style={{ ...s.th, width: '48px', cursor: 'pointer' }} onClick={() => toggleSort('status')}>
                      Status <SortIcon col="status" />
                    </th>
                    <th rowSpan={2} style={{ ...s.th, width: '36px' }} />
                  </tr>
                  {/* Row 2: tech sub-headers (only rendered when expanded) */}
                  <tr>
                    {techOpen && (
                      <>
                        <th style={{ ...s.thSub, width: '80px' }}>Lydkrav</th>
                        <th style={{ ...s.thSubNum, width: '68px', cursor: 'pointer' }} onClick={e => { e.stopPropagation(); toggleSort('uValue'); }}>
                          U-Værdi <SortIcon col="uValue" />
                        </th>
                        <th style={{ ...s.thSub, width: '80px' }}>Brandklasse</th>
                        <th style={{ ...s.thSubNum, width: '72px', cursor: 'pointer' }} onClick={e => { e.stopPropagation(); toggleSort('selfWeight'); }}>
                          Egenlast <SortIcon col="selfWeight" />
                        </th>
                        <th style={{ ...s.thSubNum, width: '80px', cursor: 'pointer' }} onClick={e => { e.stopPropagation(); toggleSort('gwpSum'); }}>
                          LCA-CO₂ <SortIcon col="gwpSum" />
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((el, i) => {
                    const gc   = el.gwpSum != null ? gwpColour(el.gwpSum) : null;
                    const sub  = el.bim7aaSubcategory;
                    const st   = el.status != null ? STATUS_MAP[el.status] : null;
                    const isOpen  = expanded.has(el.id);
                    const products = expandedData[el.id];
                    const rowBg = i % 2 === 0 ? s.rowEven : s.rowOdd;
                    const colCount = techOpen ? 13 : 9;
                    return [
                      <tr
                        key={el.id}
                        style={{ ...rowBg, cursor: 'pointer' }}
                        onClick={() => navigate(`/elements/${el.id}`)}
                      >
                        {/* Kat. (number only) */}
                        <td style={s.tdCenter}>
                          <span style={s.catNumCell}>{el.bim7aaCategory}</span>
                        </td>
                        {/* Kategori (subcategory) */}
                        <td style={s.td}>
                          {sub
                            ? <span style={s.subChip}>
                                <span style={s.subCode}>{sub}</span>
                                <span style={{ color: '#777' }}>{BIM7AA_SUB[sub]}</span>
                              </span>
                            : <span style={{ color: '#ddd' }}>—</span>}
                        </td>
                        {/* Typenummer */}
                        <td style={s.td}>
                          {el.typeNumber
                            ? <span style={s.typeChip}>{el.typeNumber}</span>
                            : <span style={{ color: '#ddd' }}>—</span>}
                        </td>
                        {/* Objektnavn */}
                        <td style={s.tdName}>{el.name}</td>
                        {/* Komponenter — click to expand materials */}
                        <td style={s.tdBkomp} onClick={e => toggleExpand(el.id, e)}>
                          <div style={{ ...s.bkompBtn, ...(isOpen ? s.bkompBtnOpen : {}) }}>
                            <span style={s.bkompArrow}>{isOpen ? '▼' : '▶'}</span>
                            {el.buildingComponents
                              ? <span style={s.bkompText}>{trunc(el.buildingComponents, 18)}</span>
                              : <span style={s.bkompEmpty}>—</span>}
                          </div>
                        </td>
                        {/* Oprettet af */}
                        <td style={s.td}><span style={s.smallText}>{dash(el.createdByUsername)}</span></td>
                        {/* Technical properties */}
                        {techOpen ? (
                          <>
                            <td style={s.td}><span style={s.smallText}>{dash(el.soundRequirement)}</span></td>
                            <td style={s.tdNum}>
                              {el.uValue != null
                                ? <span style={s.numVal}>{Number(el.uValue).toFixed(2)}</span>
                                : <span style={{ color: '#ddd' }}>—</span>}
                            </td>
                            <td style={s.td}><span style={s.smallText}>{dash(el.fireClass)}</span></td>
                            <td style={s.tdNum}>
                              {el.selfWeight != null
                                ? <span style={s.numVal}>{Number(el.selfWeight).toFixed(1)}</span>
                                : <span style={{ color: '#ddd' }}>—</span>}
                            </td>
                            <td style={s.tdNum}>
                              {gc
                                ? <span style={{ ...s.gwpChip, color: gc.color, background: gc.bg }}>
                                    {el.gwpSum < 0 ? el.gwpSum.toFixed(1) : `+${el.gwpSum.toFixed(1)}`}
                                  </span>
                                : <span style={{ color: '#ddd' }}>—</span>}
                            </td>
                          </>
                        ) : (
                          <td style={s.tdNum} />
                        )}
                        {/* Status */}
                        <td style={s.tdCenter}>
                          {st
                            ? <span style={{ ...s.statusChip, color: st.color, background: st.bg }}>{st.label}</span>
                            : <span style={{ color: '#ddd' }}>—</span>}
                        </td>
                        {/* delete */}
                        <td style={s.tdAction} onClick={e => e.stopPropagation()}>
                          <button style={s.deleteBtn} onClick={e => handleDelete(el.id, e)} title="Delete element">✕</button>
                        </td>
                      </tr>,

                      isOpen && (
                        <tr key={`${el.id}-exp`} style={rowBg}>
                          <td colSpan={colCount} style={s.expandedCell}>
                            {!products ? (
                              <span style={s.expandLoading}>Loading…</span>
                            ) : products.length === 0 ? (
                              <span style={s.expandEmpty}>No materials added yet.</span>
                            ) : (
                              <table style={s.miniTable}>
                                <thead>
                                  <tr>
                                    <th style={s.miniTh}>Product</th>
                                    <th style={s.miniTh}>Category</th>
                                    <th style={s.miniTh}>Material</th>
                                    <th style={s.miniTh}>Fire rating</th>
                                    <th style={{ ...s.miniTh, textAlign: 'right' }}>GWP A1–A3</th>
                                    <th style={s.miniTh}>Manufacturer</th>
                                    <th style={s.miniTh}>Notes</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {products.map(ep => {
                                    const p = ep.product;
                                    const pgc = p.gwpA1A3 != null ? gwpColour(p.gwpA1A3) : null;
                                    return (
                                      <tr key={ep.id} style={s.miniRow}>
                                        <td style={s.miniTdName}
                                            onClick={e => { e.stopPropagation(); navigate(`/product/${p.id}`); }}>
                                          {p.name}
                                        </td>
                                        <td style={s.miniTd}>{p.category ?? <span style={{ color: '#ddd' }}>—</span>}</td>
                                        <td style={s.miniTd}>{p.material ?? <span style={{ color: '#ddd' }}>—</span>}</td>
                                        <td style={s.miniTd}>{p.fireRating ?? <span style={{ color: '#ddd' }}>—</span>}</td>
                                        <td style={{ ...s.miniTd, textAlign: 'right' }}>
                                          {pgc
                                            ? <span style={{ ...s.gwpChip, color: pgc.color, background: pgc.bg, fontSize: '0.73rem' }}>
                                                {p.gwpA1A3 < 0 ? p.gwpA1A3.toFixed(1) : `+${p.gwpA1A3.toFixed(1)}`}
                                              </span>
                                            : <span style={{ color: '#ddd' }}>—</span>}
                                        </td>
                                        <td style={s.miniTd}>{p.manufacturerName ?? <span style={{ color: '#ddd' }}>—</span>}</td>
                                        <td style={{ ...s.miniTd, color: '#888', fontStyle: 'italic' }}>
                                          {ep.notes ?? <span style={{ color: '#ddd' }}>—</span>}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            )}
                          </td>
                        </tr>
                      ),
                    ];
                  })}
                </tbody>
              </table>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}

const s = {
  page:       { padding: '24px 28px', maxWidth: '1700px', margin: '0 auto' },
  state:      { textAlign: 'center', padding: '60px', color: '#808080' },
  topBar:     { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px', gap: '16px' },
  heading:    { fontSize: '1.4rem', fontWeight: 700, margin: '0 0 4px', color: '#000000' },
  sub:        { margin: 0, fontSize: '0.85rem', color: '#808080' },
  newBtn:     { padding: '5px 16px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#000080', color: '#ffffff', cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem', flexShrink: 0, fontFamily: 'inherit' },

  formBox:    { border: '1px solid #9a9790', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', background: '#d4d0c8', padding: '16px 20px', marginBottom: '18px' },
  grid6:      { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px 14px', marginBottom: '10px' },
  field:      { display: 'flex', flexDirection: 'column', gap: '3px' },
  label:      { fontSize: '0.75rem', fontWeight: 700, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.04em' },
  input:      { border: '1px solid #9a9790', background: '#ffffff', color: '#000000', padding: '4px 8px', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none' },
  err:        { color: '#c00000', fontSize: '0.82rem', margin: '0 0 10px' },
  formBtns:   { display: 'flex', gap: '8px' },
  submitBtn:  { padding: '5px 16px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#000080', color: '#ffffff', cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem', fontFamily: 'inherit' },
  cancelBtn:  { padding: '5px 16px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#d4d0c8', color: '#000000', cursor: 'pointer', fontSize: '0.88rem', fontFamily: 'inherit' },

  // Two-column layout
  layout:      { display: 'grid', gridTemplateColumns: '220px 1fr', gap: '20px', alignItems: 'start' },

  // Sidebar
  sidebar:     { border: '1px solid #9a9790', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', background: '#d4d0c8', padding: '14px', position: 'sticky', top: '80px' },

  // Search
  searchWrap:  { position: 'relative', display: 'flex', alignItems: 'center', marginBottom: '14px' },
  searchInput: { width: '100%', padding: '5px 28px 5px 8px', border: '1px solid #9a9790', background: '#ffffff', color: '#000000', fontSize: '0.87rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  clearInput:  { position: 'absolute', right: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#808080', fontSize: '0.82rem', padding: '2px', fontFamily: 'inherit' },

  // Sidebar sections
  sideSection:    { marginBottom: '16px' },
  sideHeading:    { fontSize: '0.72rem', fontWeight: 700, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' },

  // Category list
  catList:        { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '1px' },
  catItem:        { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '4px 6px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.85rem', color: '#000000', textAlign: 'left', fontFamily: 'inherit' },
  catItemActive:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '4px 6px', border: 'none', background: '#000080', cursor: 'pointer', fontSize: '0.85rem', color: '#ffffff', fontWeight: 700, textAlign: 'left', fontFamily: 'inherit' },
  catCount:       { fontSize: '0.72rem', color: '#808080', background: '#c0c0c0', padding: '0 5px', border: '1px solid #808080', flexShrink: 0 },
  catCountActive: { fontSize: '0.72rem', color: '#ffffff', background: 'rgba(255,255,255,0.2)', padding: '0 5px', flexShrink: 0 },
  catLabelWrap:   { display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden', minWidth: 0 },
  catNumBadge:    { display: 'inline-flex', minWidth: '18px', height: '16px', background: '#c0c0c0', color: '#000000', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0, padding: '0 3px', border: '1px solid #808080' },
  catNumActive:   { display: 'inline-flex', minWidth: '18px', height: '16px', background: 'rgba(255,255,255,0.2)', color: '#ffffff', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0, padding: '0 3px' },

  // Checkbox
  checkLabel:  { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#000000', cursor: 'pointer' },
  checkbox:    { width: '13px', height: '13px', cursor: 'pointer' },

  clearAllBtn: { marginTop: '4px', width: '100%', padding: '5px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#d4d0c8', cursor: 'pointer', fontSize: '0.82rem', color: '#c00000', fontFamily: 'inherit' },

  // Main
  main:         { minWidth: 0 },
  resultsBar:   { display: 'flex', alignItems: 'center', marginBottom: '10px' },
  resultCount:  { fontSize: '0.83rem', color: '#808080' },

  empty:        { textAlign: 'center', padding: '60px 0' },
  emptyTitle:   { fontSize: '1rem', fontWeight: 700, color: '#000000', margin: '0 0 8px' },
  emptySub:     { color: '#808080', fontSize: '0.87rem', margin: '0 0 20px' },
  noResultsBtn: { marginTop: '10px', padding: '5px 16px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#000080', color: '#ffffff', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit' },

  tableWrap:  { border: '1px solid #9a9790', overflow: 'hidden', overflowX: 'auto' },
  table:      { width: 'max-content', minWidth: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' },
  th:         { padding: '8px 10px', background: '#d4d0c8', borderBottom: '1px solid #9a9790', textAlign: 'left', fontWeight: 700, color: '#000000', fontSize: '0.72rem', whiteSpace: 'nowrap', userSelect: 'none' },
  thNum:      { padding: '8px 10px', background: '#d4d0c8', borderBottom: '1px solid #9a9790', textAlign: 'right', fontWeight: 700, color: '#000000', fontSize: '0.72rem', whiteSpace: 'nowrap', userSelect: 'none', cursor: 'pointer' },
  rowEven:    { background: '#ffffff' },
  rowOdd:     { background: '#f0eeea' },
  td:         { padding: '6px 10px', borderBottom: '1px solid #d4d0c8', color: '#000000', verticalAlign: 'middle', whiteSpace: 'nowrap' },
  tdCenter:   { padding: '6px 8px', borderBottom: '1px solid #d4d0c8', textAlign: 'center', verticalAlign: 'middle' },
  tdName:     { padding: '6px 10px', borderBottom: '1px solid #d4d0c8', fontWeight: 700, color: '#000000', verticalAlign: 'middle', whiteSpace: 'nowrap' },
  tdNum:      { padding: '6px 10px', borderBottom: '1px solid #d4d0c8', textAlign: 'right', color: '#000000', verticalAlign: 'middle', whiteSpace: 'nowrap' },
  tdAction:   { padding: '4px 8px', borderBottom: '1px solid #d4d0c8', textAlign: 'right', verticalAlign: 'middle' },

  // Komponenter expand cell
  tdBkomp:      { padding: '3px 6px', borderBottom: '1px solid #d4d0c8', verticalAlign: 'middle', cursor: 'pointer', whiteSpace: 'nowrap' },
  bkompBtn:     { display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 7px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#d4d0c8', userSelect: 'none' },
  bkompBtnOpen: { borderTop: '2px solid #808080', borderLeft: '2px solid #808080', borderRight: '2px solid #ffffff', borderBottom: '2px solid #ffffff', background: '#c0bdb5' },
  bkompArrow:   { fontSize: '0.6rem', color: '#000000', flexShrink: 0, lineHeight: 1 },
  bkompText:    { fontSize: '0.78rem', color: '#000000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '108px' },
  bkompEmpty:   { fontSize: '0.78rem', color: '#c0c0c0' },
  // Tekniske egenskaber group header
  thGroup:      { padding: '6px 10px', background: '#b8b4ac', borderBottom: '1px solid #808080', textAlign: 'center', fontWeight: 700, color: '#000000', fontSize: '0.72rem', whiteSpace: 'nowrap', userSelect: 'none' },
  thSub:        { padding: '4px 10px', background: '#ccc8c0', borderBottom: '1px solid #9a9790', textAlign: 'left', fontWeight: 700, color: '#000000', fontSize: '0.68rem', whiteSpace: 'nowrap', userSelect: 'none' },
  thSubNum:     { padding: '4px 10px', background: '#ccc8c0', borderBottom: '1px solid #9a9790', textAlign: 'right', fontWeight: 700, color: '#000000', fontSize: '0.68rem', whiteSpace: 'nowrap', userSelect: 'none' },

  expandedCell:  { padding: '0 16px 10px 40px', background: '#ece9e0', borderBottom: '1px solid #d4d0c8' },
  expandLoading: { fontSize: '0.8rem', color: '#808080' },
  expandEmpty:   { fontSize: '0.8rem', color: '#808080', fontStyle: 'italic' },

  miniTable:  { width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' },
  miniTh:     { padding: '4px 10px', borderBottom: '1px solid #d4d0c8', textAlign: 'left', fontWeight: 700, color: '#000000', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', background: '#d4d0c8' },
  miniRow:    { borderBottom: '1px solid #e0ddd4' },
  miniTd:     { padding: '5px 10px', color: '#404040', verticalAlign: 'middle' },
  miniTdName: { padding: '5px 10px', color: '#000080', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', verticalAlign: 'middle' },

  // Cell content styles
  statusChip:  { display: 'inline-flex', width: '22px', height: '22px', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, border: '1px solid #808080' },
  catNumCell:  { display: 'inline-flex', width: '22px', height: '22px', background: '#000080', color: '#ffffff', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700 },
  subChip:     { display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' },
  subCode:     { display: 'inline-block', background: '#c0c0c0', color: '#000000', padding: '0 4px', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0, border: '1px solid #808080' },
  typeChip:    { display: 'inline-block', background: '#c0c0c0', color: '#000080', padding: '0 6px', fontSize: '0.78rem', fontWeight: 700, border: '1px solid #808080' },
  smallText:   { fontSize: '0.8rem', color: '#404040' },
  numVal:      { fontSize: '0.82rem', color: '#000000', fontVariantNumeric: 'tabular-nums' },
  gwpChip:     { display: 'inline-block', padding: '1px 6px', fontSize: '0.76rem', fontWeight: 700, border: '1px solid currentColor' },
  noData:      { color: '#c0c0c0' },
  deleteBtn:   { borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#d4d0c8', cursor: 'pointer', color: '#000000', fontSize: '0.8rem', padding: '1px 5px', fontFamily: 'inherit' },

  // Product search in create form
  prodSection:     { borderTop: '1px solid #9a9790', marginTop: '12px', paddingTop: '12px' },
  prodSectionLabel:{ fontSize: '0.75rem', fontWeight: 700, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' },
  prodSearchRow:   { display: 'flex', gap: '8px', marginBottom: '6px' },
  prodSearchHint:  { position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: '#808080', pointerEvents: 'none' },
  prodResults:     { border: '1px solid #9a9790', background: '#ffffff', marginBottom: '8px' },
  prodResult:      { display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '5px 10px', border: 'none', borderBottom: '1px solid #e8e6e0', background: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', fontSize: '0.85rem' },
  prodResultAdded: { display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '5px 10px', border: 'none', borderBottom: '1px solid #e8e6e0', background: '#f0eeea', cursor: 'default', textAlign: 'left', fontFamily: 'inherit', fontSize: '0.85rem', color: '#808080' },
  prodResultName:  { fontWeight: 600, color: '#000000', flexShrink: 0 },
  prodResultMeta:  { fontSize: '0.78rem', color: '#808080' },
  prodList:        { display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' },
  prodListRow:     { display: 'flex', alignItems: 'center', gap: '8px', background: '#ece9e0', border: '1px solid #9a9790', padding: '4px 8px' },
  prodListName:    { fontWeight: 700, fontSize: '0.85rem', color: '#000000', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  prodAmountInput: { width: '72px', border: '1px solid #9a9790', background: '#ffffff', color: '#000000', padding: '2px 6px', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none', flexShrink: 0 },
  prodUnitSelect:  { border: '1px solid #9a9790', background: '#ffffff', color: '#000000', padding: '2px 4px', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none', flexShrink: 0 },
  prodListRemove:  { background: 'none', border: 'none', cursor: 'pointer', color: '#808080', fontSize: '0.82rem', padding: '0 2px', lineHeight: 1, fontFamily: 'inherit', flexShrink: 0 },
  sortActive:  { color: '#000000', marginLeft: '3px', fontSize: '0.68rem' },
  sortInactive:{ color: '#808080', marginLeft: '3px', fontSize: '0.68rem' },
};
