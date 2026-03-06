import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import api from '../services/api';
import AddElementToProjectModal from '../components/AddElementToProjectModal';
import { BIM7AA, BIM7AA_SUB } from '../utils/bim7aa';
import { gwpColour, fireRatingColour } from '../utils/colours';

const STATUS_LABELS = { 1: 'Draft', 2: 'Preliminary', 3: 'Final' };
const STATUS_COLORS = {
  1: { bg: '#fff3e0', color: '#e65100', border: '#e65100' },
  2: { bg: '#e3f2fd', color: '#1565c0', border: '#1565c0' },
  3: { bg: '#e8f5e9', color: '#2e7d32', border: '#2e7d32' },
};

function getSubcats(cat) {
  return Object.entries(BIM7AA_SUB)
    .filter(([k]) => k.startsWith(`${cat}.`))
    .map(([k, v]) => ({ code: k, label: v }));
}


function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function PropRow({ label, value }) {
  const hasValue = value != null && value !== '';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#808080', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div style={{ fontSize: '0.88rem', color: hasValue ? '#000000' : '#c0c0c0', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
        {hasValue ? String(value) : '—'}
      </div>
    </div>
  );
}

PropRow.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default function ElementDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [element, setElement]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Header editing
  const [editingHeader, setEditingHeader] = useState(false);
  const [headerForm, setHeaderForm] = useState({
    name: '', description: '', bim7aaCategory: '2', bim7aaSubcategory: '',
    typeNumber: '', status: '', entreprise: '', workDescriptionNumber: '',
    responsibility: '', soundRequirement: '', uValue: '', fireClass: '',
    selfWeight: '', unitPrice: '', unit: '', work: '',
    buildingComponents: '', buildingPartAnalysis: '',
  });

  // Product search
  const [search, setSearch]               = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching]         = useState(false);
  const [addError, setAddError]           = useState('');

  // Notes editing
  const [editingNotesId, setEditingNotesId] = useState(null);
  const [notesValue, setNotesValue]         = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { load(); }, [id]);

  async function load() {
    try {
      const res = await api.get(`/elements/${id}`);
      setElement(res.data);
    } catch (err) {
      if (err.response?.status === 404) setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  // ── Header edit ────────────────────────────────────────────────
  function startHeaderEdit() {
    setHeaderForm({
      name:                 element.name,
      description:          element.description ?? '',
      bim7aaCategory:       String(element.bim7aaCategory),
      bim7aaSubcategory:    element.bim7aaSubcategory ?? '',
      typeNumber:           element.typeNumber ?? '',
      status:               element.status != null ? String(element.status) : '',
      entreprise:           element.entreprise ?? '',
      workDescriptionNumber: element.workDescriptionNumber ?? '',
      responsibility:       element.responsibility ?? '',
      soundRequirement:     element.soundRequirement ?? '',
      uValue:               element.uValue != null ? String(element.uValue) : '',
      fireClass:            element.fireClass ?? '',
      selfWeight:           element.selfWeight != null ? String(element.selfWeight) : '',
      unitPrice:            element.unitPrice != null ? String(element.unitPrice) : '',
      unit:                 element.unit ?? '',
      work:                 element.work ?? '',
      buildingComponents:   element.buildingComponents ?? '',
      buildingPartAnalysis: element.buildingPartAnalysis ?? '',
    });
    setEditingHeader(true);
  }

  async function saveHeader() {
    if (!headerForm.name.trim()) return;
    try {
      const res = await api.put(`/elements/${id}`, {
        name:                 headerForm.name.trim(),
        description:          headerForm.description.trim() || null,
        bim7aaCategory:       parseInt(headerForm.bim7aaCategory),
        bim7aaSubcategory:    headerForm.bim7aaSubcategory || null,
        typeNumber:           headerForm.typeNumber.trim() || null,
        status:               headerForm.status ? parseInt(headerForm.status) : null,
        entreprise:           headerForm.entreprise.trim() || null,
        workDescriptionNumber: headerForm.workDescriptionNumber.trim() || null,
        responsibility:       headerForm.responsibility.trim() || null,
        soundRequirement:     headerForm.soundRequirement.trim() || null,
        uValue:               headerForm.uValue !== '' ? parseFloat(headerForm.uValue) : null,
        fireClass:            headerForm.fireClass.trim() || null,
        selfWeight:           headerForm.selfWeight !== '' ? parseFloat(headerForm.selfWeight) : null,
        unitPrice:            headerForm.unitPrice !== '' ? parseFloat(headerForm.unitPrice) : null,
        unit:                 headerForm.unit.trim() || null,
        work:                 headerForm.work.trim() || null,
        buildingComponents:   headerForm.buildingComponents.trim() || null,
        buildingPartAnalysis: headerForm.buildingPartAnalysis.trim() || null,
      });
      setElement(el => ({ ...el, ...res.data }));
      setEditingHeader(false);
    } catch { alert('Failed to save.'); }
  }

  // ── Product search ─────────────────────────────────────────────
  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    const t = setTimeout(() => {
      setSearching(true);
      api.get(`/products?search=${encodeURIComponent(search.trim())}`)
        .then(res => setSearchResults((res.data ?? []).slice(0, 8)))
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  async function addProduct(product) {
    setAddError('');
    try {
      const res = await api.post(`/elements/${id}/products`, { productId: product.id });
      setElement(el => ({ ...el, products: [...el.products, res.data] }));
      setSearch('');
      setSearchResults([]);
    } catch (err) {
      setAddError(err.response?.data?.error ?? 'Failed to add product.');
    }
  }

  async function removeProduct(epId) {
    if (!confirm('Remove this product from the element?')) return;
    try {
      await api.delete(`/elements/${id}/products/${epId}`);
      setElement(el => ({ ...el, products: el.products.filter(p => p.id !== epId) }));
    } catch { alert('Failed to remove product.'); }
  }

  async function updateNotes(epId, notes) {
    setElement(el => ({
      ...el,
      products: el.products.map(p => p.id === epId ? { ...p, notes } : p),
    }));
    setEditingNotesId(null);
  }

  // ── Summary ────────────────────────────────────────────────────
  const summary = useMemo(() => {
    if (!element) return null;
    const total   = element.products.length;
    const withGwp = element.products.filter(p => p.product.gwpA1A3 != null);
    const gwpSum  = withGwp.reduce((sum, p) => sum + Number(p.product.gwpA1A3), 0);
    return { total, gwpSum: withGwp.length > 0 ? gwpSum : null, withGwp: withGwp.length };
  }, [element]);

  const hasExtendedGwp = useMemo(() => {
    if (!element) return false;
    return element.products.some(ep =>
      ep.product.gwpB4 != null || ep.product.gwpB6 != null ||
      ep.product.gwpC3 != null || ep.product.gwpC4 != null
    );
  }, [element]);

  if (loading)  return <div style={s.state}>Loading…</div>;
  if (notFound) return (
    <div style={s.state}>
      <p>Element not found.</p>
      <Link to="/elements" style={s.back}>← Back to Elements</Link>
    </div>
  );

  const stColor = element.status ? STATUS_COLORS[element.status] : null;

  return (
    <div style={s.page}>
      <Link to="/elements" style={s.back}>← Elements</Link>

      {/* ── Header ── */}
      {editingHeader ? (
        <div style={s.headerEditBox}>

          {/* Row 1: Name, BIM Category, Subcategory, Type Number */}
          <div style={s.grid4}>
            <div>
              <label style={s.label}>Name *</label>
              <input style={s.input} value={headerForm.name}
                onChange={e => setHeaderForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Element name" autoFocus />
            </div>
            <div>
              <label style={s.label}>BIM7AA Category</label>
              <select style={s.input} value={headerForm.bim7aaCategory}
                onChange={e => setHeaderForm(f => ({ ...f, bim7aaCategory: e.target.value, bim7aaSubcategory: '' }))}>
                {Object.entries(BIM7AA).map(([k, v]) => (
                  <option key={k} value={k}>{k} – {v}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={s.label}>Subcategory</label>
              <select style={s.input} value={headerForm.bim7aaSubcategory}
                onChange={e => setHeaderForm(f => ({ ...f, bim7aaSubcategory: e.target.value }))}
                disabled={getSubcats(parseInt(headerForm.bim7aaCategory)).length === 0}>
                <option value="">— None —</option>
                {getSubcats(parseInt(headerForm.bim7aaCategory)).map(sub => (
                  <option key={sub.code} value={sub.code}>{sub.code} – {sub.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={s.label}>Type Number</label>
              <input style={s.input} value={headerForm.typeNumber}
                onChange={e => setHeaderForm(f => ({ ...f, typeNumber: e.target.value }))}
                placeholder="e.g. V-01" />
            </div>
          </div>

          {/* Row 2: Status, Entreprise, Work Desc. Nr., Responsibility */}
          <div style={s.grid4}>
            <div>
              <label style={s.label}>Status</label>
              <select style={s.input} value={headerForm.status}
                onChange={e => setHeaderForm(f => ({ ...f, status: e.target.value }))}>
                <option value="">— None —</option>
                <option value="1">1 – Draft</option>
                <option value="2">2 – Preliminary</option>
                <option value="3">3 – Final</option>
              </select>
            </div>
            <div>
              <label style={s.label}>Entreprise</label>
              <input style={s.input} value={headerForm.entreprise}
                onChange={e => setHeaderForm(f => ({ ...f, entreprise: e.target.value }))}
                placeholder="e.g. Tømrer" />
            </div>
            <div>
              <label style={s.label}>Work Desc. Nr.</label>
              <input style={s.input} value={headerForm.workDescriptionNumber}
                onChange={e => setHeaderForm(f => ({ ...f, workDescriptionNumber: e.target.value }))}
                placeholder="e.g. 1.1.2" />
            </div>
            <div>
              <label style={s.label}>Responsibility</label>
              <input style={s.input} value={headerForm.responsibility}
                onChange={e => setHeaderForm(f => ({ ...f, responsibility: e.target.value }))}
                placeholder="e.g. RH" />
            </div>
          </div>

          {/* Row 3: U-Value, Fire Class, Self Weight, Sound Requirement */}
          <div style={s.grid4}>
            <div>
              <label style={s.label}>U-Value (W/m²K)</label>
              <input style={s.input} type="number" step="0.01" value={headerForm.uValue}
                onChange={e => setHeaderForm(f => ({ ...f, uValue: e.target.value }))}
                placeholder="e.g. 0.15" />
            </div>
            <div>
              <label style={s.label}>Fire Class</label>
              <input style={s.input} value={headerForm.fireClass}
                onChange={e => setHeaderForm(f => ({ ...f, fireClass: e.target.value }))}
                placeholder="e.g. REI 60" />
            </div>
            <div>
              <label style={s.label}>Self Weight (kg/m²)</label>
              <input style={s.input} type="number" step="0.1" value={headerForm.selfWeight}
                onChange={e => setHeaderForm(f => ({ ...f, selfWeight: e.target.value }))}
                placeholder="e.g. 120" />
            </div>
            <div>
              <label style={s.label}>Sound Requirement</label>
              <input style={s.input} value={headerForm.soundRequirement}
                onChange={e => setHeaderForm(f => ({ ...f, soundRequirement: e.target.value }))}
                placeholder="e.g. Rw ≥ 55 dB" />
            </div>
          </div>

          {/* Row 4: Unit Price, Unit, Description */}
          <div style={s.grid3}>
            <div>
              <label style={s.label}>Unit Price</label>
              <input style={s.input} type="number" step="0.01" value={headerForm.unitPrice}
                onChange={e => setHeaderForm(f => ({ ...f, unitPrice: e.target.value }))}
                placeholder="e.g. 850" />
            </div>
            <div>
              <label style={s.label}>Unit</label>
              <input style={s.input} value={headerForm.unit}
                onChange={e => setHeaderForm(f => ({ ...f, unit: e.target.value }))}
                placeholder="e.g. m²" />
            </div>
            <div>
              <label style={s.label}>Description</label>
              <input style={s.input} value={headerForm.description}
                onChange={e => setHeaderForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Optional" />
            </div>
          </div>

          {/* Full-width text fields */}
          <div>
            <label style={s.label}>Work</label>
            <textarea style={s.textarea} rows={2} value={headerForm.work}
              onChange={e => setHeaderForm(f => ({ ...f, work: e.target.value }))}
              placeholder="Work description…" />
          </div>
          <div>
            <label style={s.label}>Building Components</label>
            <textarea style={s.textarea} rows={3} value={headerForm.buildingComponents}
              onChange={e => setHeaderForm(f => ({ ...f, buildingComponents: e.target.value }))}
              placeholder="List of building components…" />
          </div>
          <div>
            <label style={s.label}>Building Part Analysis</label>
            <textarea style={s.textarea} rows={2} value={headerForm.buildingPartAnalysis}
              onChange={e => setHeaderForm(f => ({ ...f, buildingPartAnalysis: e.target.value }))}
              placeholder="Building part analysis notes…" />
          </div>

          <div style={s.headerEditBtns}>
            <button style={s.saveBtn} onClick={saveHeader}>Save</button>
            <button style={s.cancelBtn} onClick={() => setEditingHeader(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={s.header}>
          <div style={s.headerLeft}>
            <div style={s.chips}>
              <span style={s.catChip}>
                <span style={s.catNum}>{element.bim7aaCategory}</span>
                {BIM7AA[element.bim7aaCategory]}
              </span>
              {element.bim7aaSubcategory && (
                <span style={s.subChip}>
                  <span style={s.subCode}>{element.bim7aaSubcategory}</span>
                  {BIM7AA_SUB[element.bim7aaSubcategory]}
                </span>
              )}
              {element.typeNumber && (
                <span style={s.typeChip}>{element.typeNumber}</span>
              )}
              {element.status && stColor && (
                <span style={{ ...s.statusChip, background: stColor.bg, color: stColor.color, borderColor: stColor.border }}>
                  {STATUS_LABELS[element.status]}
                </span>
              )}
            </div>
            <h1 style={s.title}>{element.name}</h1>
            {element.description && <p style={s.desc}>{element.description}</p>}
          </div>
          <div style={s.headerActions}>
            <button style={s.editBtn} onClick={startHeaderEdit}>Edit</button>
            <button style={s.addProjectBtn} onClick={() => setShowModal(true)}>+ Add to project</button>
          </div>
        </div>
      )}

      {/* ── Properties panel ── */}
      {!editingHeader && (
        <div style={s.propsPanel}>
          <div style={s.propsPanelTitle}>Properties</div>
          <div style={s.propsBody}>
            <div style={s.propsGrid4}>
              <PropRow label="Entreprise"        value={element.entreprise} />
              <PropRow label="Work Desc. Nr."    value={element.workDescriptionNumber} />
              <PropRow label="Responsibility"    value={element.responsibility} />
              <PropRow label="Sound Requirement" value={element.soundRequirement} />
            </div>
            <div style={s.propsGrid4}>
              <PropRow label="U-Value"    value={element.uValue    != null ? `${element.uValue} W/m²K`  : null} />
              <PropRow label="Fire Class" value={element.fireClass} />
              <PropRow label="Self Weight" value={element.selfWeight != null ? `${element.selfWeight} kg/m²` : null} />
              <PropRow label="Unit Price / Unit" value={
                element.unitPrice != null || element.unit
                  ? [element.unitPrice != null ? element.unitPrice : null, element.unit || null].filter(Boolean).join(' / ')
                  : null
              } />
            </div>
            {(element.work || element.buildingComponents || element.buildingPartAnalysis) && (
              <div style={s.propsStack}>
                {element.work && <PropRow label="Work" value={element.work} />}
                {element.buildingComponents && <PropRow label="Building Components" value={element.buildingComponents} />}
                {element.buildingPartAnalysis && <PropRow label="Building Part Analysis" value={element.buildingPartAnalysis} />}
              </div>
            )}
          </div>
          <div style={s.metaBar}>
            <span style={s.metaItem}>
              <span style={s.metaKey}>Created</span>
              {formatDate(element.createdDate)}
            </span>
            {element.createdByUsername && (
              <span style={s.metaItem}>
                <span style={s.metaKey}>By</span>
                {element.createdByUsername}
              </span>
            )}
            {element.projectNames?.length > 0 && (
              <span style={s.metaItem}>
                <span style={s.metaKey}>Projects</span>
                {element.projectNames.join(', ')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Product search ── */}
      <div style={s.addSection}>
        <label style={s.label}>Add product</label>
        <div style={s.searchWrap}>
          <input
            style={s.searchInput}
            value={search}
            onChange={e => { setSearch(e.target.value); setAddError(''); }}
            placeholder="Search products to add…"
          />
          {searching && <span style={s.muted}>Searching…</span>}
        </div>
        {addError && <p style={s.err}>{addError}</p>}
        {searchResults.length > 0 && (
          <div style={s.results}>
            {searchResults.map(p => (
              <button key={p.id} style={s.resultItem} onClick={() => addProduct(p)}>
                <span style={s.resultName}>{p.name}</span>
                <span style={s.resultMeta}>{p.category} · {p.manufacturerName}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Products table ── */}
      {element.products.length === 0 ? (
        <div style={s.empty}>
          <p style={s.emptyText}>No products added yet. Search above to add your first product.</p>
        </div>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Product</th>
                <th style={s.th}>Category</th>
                <th style={s.th}>Material</th>
                <th style={s.th}>Fire rating</th>
                <th style={s.thRight}>GWP A1–A3</th>
                {hasExtendedGwp && <th style={s.thRight}>B4</th>}
                {hasExtendedGwp && <th style={s.thRight}>B6</th>}
                {hasExtendedGwp && <th style={s.thRight}>C3</th>}
                {hasExtendedGwp && <th style={s.thRight}>C4</th>}
                <th style={s.th}>Manufacturer</th>
                <th style={s.th}>Notes</th>
                <th style={s.th} />
              </tr>
            </thead>
            <tbody>
              {element.products.map((ep, i) => {
                const fc    = ep.product.fireRating ? fireRatingColour(ep.product.fireRating) : null;
                const gwp   = ep.product.gwpA1A3;
                const gc    = gwp != null ? gwpColour(gwp) : null;
                const gb4c  = ep.product.gwpB4 != null ? gwpColour(ep.product.gwpB4) : null;
                const gb6c  = ep.product.gwpB6 != null ? gwpColour(ep.product.gwpB6) : null;
                const gc3c  = ep.product.gwpC3 != null ? gwpColour(ep.product.gwpC3) : null;
                const gc4c  = ep.product.gwpC4 != null ? gwpColour(ep.product.gwpC4) : null;
                const isEditingNotes = editingNotesId === ep.id;

                return (
                  <tr key={ep.id} style={i % 2 === 0 ? s.rowEven : s.rowOdd}>
                    <td style={s.tdName}>
                      <Link to={`/product/${ep.product.id}`} style={s.productLink}>{ep.product.name}</Link>
                      {ep.product.gwpA1A3 != null && <span style={s.epdBadge}>EPD</span>}
                    </td>
                    <td style={s.td}><span style={s.catPill}>{ep.product.category}</span></td>
                    <td style={s.td}>{ep.product.material ?? <span style={s.noData}>—</span>}</td>
                    <td style={s.td}>
                      {fc
                        ? <span style={{ ...s.fireChip, color: fc.text, background: fc.bg }}>{ep.product.fireRating}</span>
                        : <span style={s.noData}>—</span>}
                    </td>
                    <td style={s.tdRight}>
                      {gc
                        ? <span style={{ ...s.gwpChip, color: gc.color, background: gc.bg }}>
                            {gwp < 0 ? gwp : `+${gwp}`}
                          </span>
                        : <span style={s.noData}>—</span>}
                    </td>
                    {hasExtendedGwp && (
                      <td style={s.tdRight}>
                        {gb4c
                          ? <span style={{ ...s.gwpChip, color: gb4c.color, background: gb4c.bg }}>{ep.product.gwpB4 < 0 ? ep.product.gwpB4 : `+${ep.product.gwpB4}`}</span>
                          : <span style={s.noData}>—</span>}
                      </td>
                    )}
                    {hasExtendedGwp && (
                      <td style={s.tdRight}>
                        {gb6c
                          ? <span style={{ ...s.gwpChip, color: gb6c.color, background: gb6c.bg }}>{ep.product.gwpB6 < 0 ? ep.product.gwpB6 : `+${ep.product.gwpB6}`}</span>
                          : <span style={s.noData}>—</span>}
                      </td>
                    )}
                    {hasExtendedGwp && (
                      <td style={s.tdRight}>
                        {gc3c
                          ? <span style={{ ...s.gwpChip, color: gc3c.color, background: gc3c.bg }}>{ep.product.gwpC3 < 0 ? ep.product.gwpC3 : `+${ep.product.gwpC3}`}</span>
                          : <span style={s.noData}>—</span>}
                      </td>
                    )}
                    {hasExtendedGwp && (
                      <td style={s.tdRight}>
                        {gc4c
                          ? <span style={{ ...s.gwpChip, color: gc4c.color, background: gc4c.bg }}>{ep.product.gwpC4 < 0 ? ep.product.gwpC4 : `+${ep.product.gwpC4}`}</span>
                          : <span style={s.noData}>—</span>}
                      </td>
                    )}
                    <td style={s.td}>
                      <Link to={`/manufacturer/${ep.product.manufacturerId}`} style={s.mfrLink}>
                        {ep.product.manufacturerName}
                      </Link>
                    </td>
                    <td style={s.td}>
                      {isEditingNotes ? (
                        <div style={s.notesEdit}>
                          <input
                            style={s.notesInput}
                            value={notesValue}
                            onChange={e => setNotesValue(e.target.value)}
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter')  updateNotes(ep.id, notesValue);
                              if (e.key === 'Escape') setEditingNotesId(null);
                            }}
                          />
                          <button style={s.notesSave} onClick={() => updateNotes(ep.id, notesValue)}>✓</button>
                        </div>
                      ) : (
                        <span
                          style={s.notesCell}
                          onClick={() => { setEditingNotesId(ep.id); setNotesValue(ep.notes ?? ''); }}
                          title="Click to edit notes"
                        >
                          {ep.notes || <span style={s.noData}>Add note…</span>}
                        </span>
                      )}
                    </td>
                    <td style={s.tdAction}>
                      <button style={s.removeBtn} onClick={() => removeProduct(ep.id)} title="Remove">✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Summary ── */}
      {summary && summary.total > 0 && (
        <div style={s.summaryCard}>
          <div style={s.summaryTitle}>Element Summary</div>
          <div style={s.summaryGrid}>
            <div style={s.summaryItem}>
              <div style={s.summaryValue}>{summary.total}</div>
              <div style={s.summaryLabel}>Products</div>
            </div>
            {summary.gwpSum !== null && (
              <div style={s.summaryItem}>
                <div style={{ ...s.summaryValue, ...gwpColour(summary.gwpSum / summary.withGwp) }}>
                  {summary.gwpSum < 0 ? summary.gwpSum.toFixed(1) : `+${summary.gwpSum.toFixed(1)}`}
                </div>
                <div style={s.summaryLabel}>Total GWP A1–A3 (kg CO₂ eq, {summary.withGwp} products)</div>
              </div>
            )}
          </div>
        </div>
      )}

      {showModal && (
        <AddElementToProjectModal
          elementId={parseInt(id)}
          elementName={element.name}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

const s = {
  page:           { padding: '24px', maxWidth: '1100px', margin: '0 auto' },
  state:          { textAlign: 'center', padding: '60px', color: '#808080' },
  back:           { display: 'inline-block', fontSize: '0.85rem', color: '#000080', textDecoration: 'none', marginBottom: '18px' },

  header:         { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '14px' },
  headerLeft:     { flex: 1 },
  headerActions:  { display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0, paddingTop: '4px' },
  chips:          { display: 'flex', gap: '6px', marginBottom: '8px', alignItems: 'center', flexWrap: 'wrap' },
  catChip:        { display: 'inline-flex', alignItems: 'center', gap: '6px', border: '1px solid #9a9790', background: '#d4d0c8', padding: '2px 8px 2px 4px', fontSize: '0.82rem', color: '#000000' },
  catNum:         { display: 'inline-flex', width: '20px', height: '20px', background: '#000080', color: '#ffffff', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0 },
  subChip:        { display: 'inline-flex', alignItems: 'center', gap: '5px', border: '1px solid #9a9790', background: '#d4d0c8', padding: '2px 8px 2px 4px', fontSize: '0.82rem', color: '#000000' },
  subCode:        { display: 'inline-block', background: '#c0c0c0', color: '#000000', padding: '0 4px', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0, border: '1px solid #808080' },
  typeChip:       { display: 'inline-flex', alignItems: 'center', border: '1px solid #9a9790', background: '#c0c0c0', padding: '2px 8px', fontSize: '0.78rem', fontWeight: 700, color: '#000000', letterSpacing: '0.03em' },
  statusChip:     { display: 'inline-flex', alignItems: 'center', padding: '2px 8px', fontSize: '0.78rem', fontWeight: 700, border: '1px solid', letterSpacing: '0.03em' },
  title:          { margin: '0 0 6px', fontSize: '1.6rem', fontWeight: 700, color: '#000000' },
  desc:           { margin: 0, fontSize: '0.9rem', color: '#404040' },
  editBtn:        { padding: '5px 14px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#d4d0c8', cursor: 'pointer', fontSize: '0.82rem', color: '#000000', fontFamily: 'inherit' },
  addProjectBtn:  { padding: '5px 16px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#000080', color: '#ffffff', cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem', fontFamily: 'inherit' },

  headerEditBox:  { border: '1px solid #9a9790', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', background: '#d4d0c8', padding: '16px', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '10px' },
  grid4:          { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px 14px' },
  grid3:          { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px 14px' },
  headerEditBtns: { display: 'flex', gap: '8px' },

  label:    { display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '3px' },
  input:    { border: '1px solid #9a9790', background: '#ffffff', color: '#000000', padding: '4px 8px', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' },
  textarea: { border: '1px solid #9a9790', background: '#ffffff', color: '#000000', padding: '4px 8px', fontSize: '0.88rem', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none', resize: 'vertical' },
  saveBtn:  { padding: '5px 16px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#000080', color: '#ffffff', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' },
  cancelBtn:{ padding: '5px 16px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#d4d0c8', color: '#000000', cursor: 'pointer', fontFamily: 'inherit' },

  propsPanel:      { border: '1px solid #9a9790', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', background: '#d4d0c8', marginBottom: '14px', overflow: 'hidden' },
  propsPanelTitle: { fontSize: '0.72rem', fontWeight: 700, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.07em', padding: '6px 12px', borderBottom: '1px solid #808080', background: '#c0c0c0' },
  propsBody:       { padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '12px' },
  propsGrid4:      { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px 20px' },
  propsStack:      { display: 'flex', flexDirection: 'column', gap: '8px' },
  metaBar:         { display: 'flex', gap: '20px', padding: '7px 14px', borderTop: '1px solid #808080', background: '#c0c0c0', flexWrap: 'wrap' },
  metaItem:        { display: 'flex', gap: '6px', alignItems: 'baseline', fontSize: '0.82rem', color: '#000000' },
  metaKey:         { fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#808080', flexShrink: 0 },

  addSection:  { border: '1px solid #9a9790', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', background: '#d4d0c8', padding: '14px 16px', marginBottom: '14px' },
  searchWrap:  { display: 'flex', gap: '8px', alignItems: 'center' },
  searchInput: { flex: 1, border: '1px solid #9a9790', background: '#ffffff', color: '#000000', padding: '4px 8px', fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit' },
  muted:       { fontSize: '0.82rem', color: '#808080' },
  err:         { color: '#c00000', fontSize: '0.82rem', margin: '6px 0 0' },
  results:     { border: '1px solid #9a9790', overflow: 'hidden', maxHeight: '220px', overflowY: 'auto', marginTop: '8px', background: '#ffffff' },
  resultItem:  { display: 'flex', flexDirection: 'column', gap: '2px', width: '100%', padding: '7px 10px', background: 'none', border: 'none', borderBottom: '1px solid #e0ddd4', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' },
  resultName:  { fontWeight: 700, fontSize: '0.88rem', color: '#000000' },
  resultMeta:  { fontSize: '0.75rem', color: '#808080' },

  empty:     { textAlign: 'center', padding: '40px 0' },
  emptyText: { color: '#808080', fontSize: '0.87rem' },

  tableWrap:   { border: '1px solid #9a9790', overflow: 'hidden', marginBottom: '14px', overflowX: 'auto' },
  table:       { width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' },
  th:          { padding: '8px 12px', background: '#d4d0c8', borderBottom: '1px solid #9a9790', textAlign: 'left', fontWeight: 700, color: '#000000', fontSize: '0.72rem', whiteSpace: 'nowrap' },
  thRight:     { padding: '8px 12px', background: '#d4d0c8', borderBottom: '1px solid #9a9790', textAlign: 'right', fontWeight: 700, color: '#000000', fontSize: '0.72rem', whiteSpace: 'nowrap' },
  rowEven:     { background: '#ffffff' },
  rowOdd:      { background: '#f0eeea' },
  td:          { padding: '7px 12px', borderBottom: '1px solid #d4d0c8', color: '#000000', verticalAlign: 'middle' },
  tdName:      { padding: '7px 12px', borderBottom: '1px solid #d4d0c8', fontWeight: 700, color: '#000000', verticalAlign: 'middle', maxWidth: '220px' },
  tdRight:     { padding: '7px 12px', borderBottom: '1px solid #d4d0c8', textAlign: 'right', verticalAlign: 'middle' },
  tdAction:    { padding: '5px 12px', borderBottom: '1px solid #d4d0c8', textAlign: 'right', verticalAlign: 'middle' },
  productLink: { color: '#000080', textDecoration: 'none', fontWeight: 700 },
  epdBadge:    { display: 'inline-block', marginLeft: '5px', fontSize: '0.63rem', background: '#e8f5e9', color: '#2e7d32', padding: '0 5px', fontWeight: 700, verticalAlign: 'middle', border: '1px solid #2e7d32' },
  catPill:     { display: 'inline-block', background: '#c0c0c0', color: '#000000', padding: '1px 6px', fontSize: '0.75rem', fontWeight: 500, border: '1px solid #808080' },
  fireChip:    { display: 'inline-block', padding: '1px 6px', fontSize: '0.75rem', fontWeight: 700 },
  gwpChip:     { display: 'inline-block', padding: '1px 7px', fontSize: '0.78rem', fontWeight: 700, border: '1px solid currentColor' },
  noData:      { color: '#c0c0c0' },
  mfrLink:     { color: '#000080', textDecoration: 'none', fontSize: '0.85rem' },
  notesCell:   { cursor: 'pointer', fontSize: '0.82rem', color: '#404040', display: 'block' },
  notesEdit:   { display: 'flex', gap: '4px', alignItems: 'center' },
  notesInput:  { border: '1px solid #9a9790', background: '#ffffff', padding: '2px 5px', fontSize: '0.82rem', width: '120px', fontFamily: 'inherit', outline: 'none' },
  notesSave:   { borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#000080', color: '#ffffff', cursor: 'pointer', padding: '2px 6px', fontSize: '0.78rem', fontFamily: 'inherit' },
  removeBtn:   { borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#d4d0c8', cursor: 'pointer', color: '#000000', fontSize: '0.8rem', padding: '1px 5px', fontFamily: 'inherit' },

  summaryCard:  { border: '1px solid #9a9790', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', background: '#d4d0c8', padding: '16px 20px', marginTop: '8px' },
  summaryTitle: { fontSize: '0.72rem', fontWeight: 700, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px' },
  summaryGrid:  { display: 'flex', gap: '28px', flexWrap: 'wrap' },
  summaryItem:  { display: 'flex', flexDirection: 'column', gap: '4px' },
  summaryValue: { fontSize: '1.3rem', fontWeight: 700, color: '#000000', padding: '2px 8px', display: 'inline-block' },
  summaryLabel: { fontSize: '0.78rem', color: '#808080' },
};
