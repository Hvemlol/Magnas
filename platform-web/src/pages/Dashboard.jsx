import { useState, useEffect } from 'react';
import api from '../services/api';

const EMPTY_FORM = {
  name: '', description: '', category: '', material: '', declaredUnit: '',
  // Fire
  fireRating: '', fireResistance: '',
  // Physical
  weightPerUnit: '', thickness: '', width: '', height: '', length: '',
  // Thermal
  thermalPerformance: '',
  // Sound
  soundReductionRw: '', soundReductionRwCCtr: '', soundAbsorptionAlphaW: '',
  acousticRating: '',
  // Certifications
  certifications: '',
  // EPD
  gwpA1A3: '', gwpB4: '', gwpB6: '', gwpC3: '', gwpC4: '',
  epdUrl: '',
  // Documents
  datasheetUrl: '', bimUrl: '', installationGuideUrl: '',
  fireCertificateUrl: '', soundTestReportUrl: '', ceDeclarationUrl: '',
};
const EMPTY_PROFILE = { companyName: '', bio: '', location: '', website: '', linkedIn: '' };

export default function Dashboard() {
  const [tab, setTab] = useState('products');

  // ── products ──────────────────────────────────────────────
  const [products,  setProducts]  = useState([]);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [editId,    setEditId]    = useState(null);
  const [prodError, setProdError] = useState('');

  // ── profile ───────────────────────────────────────────────
  const [profile,       setProfile]       = useState(EMPTY_PROFILE);
  const [profileSaved,  setProfileSaved]  = useState(false);
  const [profError,     setProfError]     = useState('');

  useEffect(() => { loadProducts(); loadProfile(); }, []);

  async function loadProducts() {
    try { setProducts((await api.get('/products/mine')).data); } catch {}
  }
  function set(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })); }

  async function handleSubmit(publish) {
    setProdError('');
    const toNum  = v => v !== '' ? parseFloat(v) : null;
    const toInt  = v => v !== '' ? parseInt(v)   : null;
    const payload = {
      ...form,
      weightPerUnit:         toNum(form.weightPerUnit),
      thickness:             toNum(form.thickness),
      width:                 toNum(form.width),
      height:                toNum(form.height),
      length:                toNum(form.length),
      soundReductionRw:      toInt(form.soundReductionRw),
      soundReductionRwCCtr:  toInt(form.soundReductionRwCCtr),
      soundAbsorptionAlphaW: toNum(form.soundAbsorptionAlphaW),
      gwpA1A3:               toNum(form.gwpA1A3),
      gwpB4:                 toNum(form.gwpB4),
      gwpB6:                 toNum(form.gwpB6),
      gwpC3:                 toNum(form.gwpC3),
      gwpC4:                 toNum(form.gwpC4),
      isPublished: publish,
    };
    try {
      if (editId) await api.put(`/products/${editId}`, payload);
      else        await api.post('/products', payload);
      setForm(EMPTY_FORM); setEditId(null); loadProducts();
    } catch (err) { setProdError(err.response?.data?.error ?? 'Failed to save.'); }
  }

  async function togglePublish(product) {
    try {
      const res = await api.patch(`/products/${product.id}/publish`);
      setProducts(ps => ps.map(p => p.id === product.id ? { ...p, isPublished: res.data.isPublished } : p));
    } catch { alert('Failed to update status.'); }
  }

  function startEdit(p) {
    const n = v => v != null ? String(v) : '';
    setEditId(p.id);
    setForm({
      name: p.name, description: p.description, category: p.category,
      material: p.material, declaredUnit: p.declaredUnit ?? '',
      // Fire
      fireRating: p.fireRating ?? '', fireResistance: p.fireResistance ?? '',
      // Physical
      weightPerUnit: n(p.weightPerUnit), thickness: n(p.thickness),
      width: n(p.width), height: n(p.height), length: n(p.length),
      // Thermal
      thermalPerformance: p.thermalPerformance ?? '',
      // Sound
      soundReductionRw: n(p.soundReductionRw),
      soundReductionRwCCtr: n(p.soundReductionRwCCtr),
      soundAbsorptionAlphaW: n(p.soundAbsorptionAlphaW),
      acousticRating: p.acousticRating ?? '',
      // Certifications
      certifications: p.certifications ?? '',
      // EPD
      gwpA1A3: n(p.gwpA1A3), gwpB4: n(p.gwpB4), gwpB6: n(p.gwpB6),
      gwpC3: n(p.gwpC3), gwpC4: n(p.gwpC4),
      epdUrl: p.epdUrl ?? '',
      // Documents
      datasheetUrl: p.datasheetUrl ?? '', bimUrl: p.bimUrl ?? '',
      installationGuideUrl: p.installationGuideUrl ?? '',
      fireCertificateUrl: p.fireCertificateUrl ?? '',
      soundTestReportUrl: p.soundTestReportUrl ?? '',
      ceDeclarationUrl: p.ceDeclarationUrl ?? '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function cancelEdit() { setEditId(null); setForm(EMPTY_FORM); setProdError(''); }

  async function handleDelete(id) {
    if (!confirm('Delete this product?')) return;
    try { await api.delete(`/products/${id}`); setProducts(ps => ps.filter(p => p.id !== id)); }
    catch { alert('Failed to delete.'); }
  }

  async function loadProfile() {
    try {
      const me = JSON.parse(localStorage.getItem('user') ?? '{}');
      if (!me.id) return;
      const d = (await api.get(`/manufacturers/${me.id}`)).data;
      setProfile({ companyName: d.companyName ?? '', bio: d.bio ?? '', location: d.location ?? '', website: d.website ?? '', linkedIn: d.linkedIn ?? '' });
    } catch {}
  }
  function setProf(field) { return e => setProfile(p => ({ ...p, [field]: e.target.value })); }
  async function saveProfile() {
    setProfError(''); setProfileSaved(false);
    try { await api.put('/manufacturers/profile', profile); setProfileSaved(true); setTimeout(() => setProfileSaved(false), 3000); }
    catch (err) { setProfError(err.response?.data?.error ?? 'Failed to save profile.'); }
  }

  const published = products.filter(p => p.isPublished);
  const drafts    = products.filter(p => !p.isPublished);

  return (
    <div style={st.page}>
      <div style={st.tabBar}>
        {['products', 'profile'].map(t => (
          <button key={t} style={tab === t ? st.tabActive : st.tab} onClick={() => setTab(t)}>
            {t === 'products' ? 'Products' : 'Company Profile'}
          </button>
        ))}
      </div>

      {/* ── PRODUCTS ── */}
      {tab === 'products' && (
        <>
          <h2 style={st.heading}>My Products</h2>
          <div style={st.formBox}>
            <h3 style={st.subheading}>{editId ? 'Edit Product' : 'Add New Product'}</h3>
            {prodError && <div style={st.error}>{prodError}</div>}

            <FormSection title="Basic Information">
              <div style={st.grid2}>
                <Field label="Product name *" ><input style={st.input} value={form.name}     onChange={set('name')} /></Field>
                <Field label="Category *"     ><input style={st.input} value={form.category} onChange={set('category')} /></Field>
                <Field label="Material *"     ><input style={st.input} value={form.material} onChange={set('material')} /></Field>
                <Field label="Declared unit"  ><input style={st.input} value={form.declaredUnit} onChange={set('declaredUnit')} placeholder="per m², per kg, per unit…" /></Field>
              </div>
              <Field label="Description *">
                <textarea style={{ ...st.input, height: '80px', resize: 'vertical', fontFamily: 'inherit' }}
                  value={form.description} onChange={set('description')} />
              </Field>
            </FormSection>

            <FormSection title="Fire Properties">
              <div style={st.grid2}>
                <Field label="Fire rating (Euroclass)" hint="e.g. A1, A2-s1,d0, B-s1,d0">
                  <input style={st.input} value={form.fireRating} onChange={set('fireRating')} placeholder="A2-s1,d0" />
                </Field>
                <Field label="Fire resistance" hint="Structural resistance, e.g. REI 60, EI 30">
                  <input style={st.input} value={form.fireResistance} onChange={set('fireResistance')} placeholder="REI 60" />
                </Field>
              </div>
            </FormSection>

            <FormSection title="Physical Properties">
              <div style={st.grid3}>
                <Field label="Weight per unit" hint="kg">
                  <input style={st.input} type="number" step="0.01" value={form.weightPerUnit} onChange={set('weightPerUnit')} placeholder="e.g. 12.5" />
                </Field>
                <Field label="Thickness" hint="mm">
                  <input style={st.input} type="number" step="0.1" value={form.thickness} onChange={set('thickness')} placeholder="e.g. 100" />
                </Field>
                <Field label="Width" hint="mm">
                  <input style={st.input} type="number" step="0.1" value={form.width} onChange={set('width')} placeholder="e.g. 600" />
                </Field>
                <Field label="Height" hint="mm">
                  <input style={st.input} type="number" step="0.1" value={form.height} onChange={set('height')} placeholder="e.g. 2400" />
                </Field>
                <Field label="Length" hint="mm">
                  <input style={st.input} type="number" step="0.1" value={form.length} onChange={set('length')} placeholder="e.g. 1200" />
                </Field>
                <Field label="Thermal performance" hint="e.g. λ = 0.035 W/mK">
                  <input style={st.input} value={form.thermalPerformance} onChange={set('thermalPerformance')} />
                </Field>
              </div>
            </FormSection>

            <FormSection title="Sound Properties">
              <div style={st.grid3}>
                <Field label="Sound reduction Rw" hint="dB">
                  <input style={st.input} type="number" step="1" value={form.soundReductionRw} onChange={set('soundReductionRw')} placeholder="e.g. 52" />
                </Field>
                <Field label="Rw (C; Ctr)" hint="dB — incl. spectrum adaptation">
                  <input style={st.input} type="number" step="1" value={form.soundReductionRwCCtr} onChange={set('soundReductionRwCCtr')} placeholder="e.g. -3; -8" />
                </Field>
                <Field label="Sound absorption αw" hint="0.00 – 1.00">
                  <input style={st.input} type="number" step="0.01" min="0" max="1" value={form.soundAbsorptionAlphaW} onChange={set('soundAbsorptionAlphaW')} placeholder="e.g. 0.85" />
                </Field>
                <Field label="Acoustic rating (free text)" hint="Legacy field">
                  <input style={st.input} value={form.acousticRating} onChange={set('acousticRating')} placeholder="e.g. Rw 52 dB" />
                </Field>
              </div>
            </FormSection>

            <FormSection title="Certifications">
              <Field label="Certifications" hint="e.g. CE marked, BBA, FSC, UKCA">
                <input style={st.input} value={form.certifications} onChange={set('certifications')} />
              </Field>
            </FormSection>

            <FormSection title="Environmental Product Declaration (EPD)">
              <p style={st.epdHint}>EN 15804 lifecycle stages — Global Warming Potential in kg CO₂ eq. Negative values indicate carbon sequestration.</p>
              <div style={st.grid2}>
                <Field label="GWP A1–A3" hint="Product stage: extraction, transport, manufacturing">
                  <input style={st.input} type="number" step="0.01" value={form.gwpA1A3} onChange={set('gwpA1A3')} placeholder="e.g. 12.4 or -514" />
                </Field>
                <Field label="GWP B4" hint="Replacement during use phase">
                  <input style={st.input} type="number" step="0.01" value={form.gwpB4} onChange={set('gwpB4')} placeholder="e.g. 24.8" />
                </Field>
                <Field label="GWP B6" hint="Operational energy use">
                  <input style={st.input} type="number" step="0.01" value={form.gwpB6} onChange={set('gwpB6')} placeholder="e.g. 145.0" />
                </Field>
                <Field label="GWP C3" hint="Waste processing at end of life">
                  <input style={st.input} type="number" step="0.01" value={form.gwpC3} onChange={set('gwpC3')} placeholder="e.g. 1.2" />
                </Field>
                <Field label="GWP C4" hint="Disposal at end of life">
                  <input style={st.input} type="number" step="0.01" value={form.gwpC4} onChange={set('gwpC4')} placeholder="e.g. 0.8" />
                </Field>
                <Field label="EPD document URL">
                  <input style={st.input} type="url" value={form.epdUrl} onChange={set('epdUrl')} placeholder="https://…" />
                </Field>
              </div>
            </FormSection>

            <FormSection title="Documents & Downloads">
              <div style={st.grid2}>
                <Field label="Produktdatablad URL" hint="Technical datasheet PDF">
                  <input style={st.input} type="url" value={form.datasheetUrl} onChange={set('datasheetUrl')} placeholder="https://…" />
                </Field>
                <Field label="Installation guide URL">
                  <input style={st.input} type="url" value={form.installationGuideUrl} onChange={set('installationGuideUrl')} placeholder="https://…" />
                </Field>
                <Field label="Fire certificate URL" hint="Fire test report / certificate">
                  <input style={st.input} type="url" value={form.fireCertificateUrl} onChange={set('fireCertificateUrl')} placeholder="https://…" />
                </Field>
                <Field label="Sound test report URL">
                  <input style={st.input} type="url" value={form.soundTestReportUrl} onChange={set('soundTestReportUrl')} placeholder="https://…" />
                </Field>
                <Field label="CE declaration URL" hint="Declaration of Performance">
                  <input style={st.input} type="url" value={form.ceDeclarationUrl} onChange={set('ceDeclarationUrl')} placeholder="https://…" />
                </Field>
                <Field label="BIM object URL" hint="Revit / IFC / ArchiCAD">
                  <input style={st.input} type="url" value={form.bimUrl} onChange={set('bimUrl')} placeholder="https://…" />
                </Field>
              </div>
            </FormSection>

            <div style={st.formBtns}>
              <button onClick={() => handleSubmit(false)} style={st.draftBtn}>Save without publishing</button>
              <button onClick={() => handleSubmit(true)}  style={st.publishBtn}>Save and publish</button>
              {editId && <button onClick={cancelEdit} style={st.cancelBtn}>Cancel</button>}
            </div>
          </div>

          <Section title="Published" badge="Live" badgeStyle={st.liveBadge}
            products={published} onEdit={startEdit} onToggle={togglePublish} onDelete={handleDelete}
            emptyMsg="No published products." />
          <Section title="Drafts" badge="Draft" badgeStyle={st.draftBadge}
            products={drafts} onEdit={startEdit} onToggle={togglePublish} onDelete={handleDelete}
            emptyMsg="No drafts." />
        </>
      )}

      {/* ── PROFILE ── */}
      {tab === 'profile' && (
        <>
          <h2 style={st.heading}>Company Profile</h2>
          <p style={st.hint}>This appears on your public profile page visible to architects.</p>
          <div style={st.formBox}>
            {profError    && <div style={st.error}>{profError}</div>}
            {profileSaved && <div style={st.success}>Profile saved.</div>}
            <div style={st.grid2}>
              <Field label="Company Name"><input style={st.input} value={profile.companyName} onChange={setProf('companyName')} placeholder="Acme Building Materials Ltd" /></Field>
              <Field label="Location"><input style={st.input} value={profile.location} onChange={setProf('location')} placeholder="London, UK" /></Field>
            </div>
            <Field label="Bio">
              <textarea style={{ ...st.input, height: '96px', resize: 'vertical', fontFamily: 'inherit' }}
                value={profile.bio} onChange={setProf('bio')}
                placeholder="A short description of your company — what you make, your specialisms, experience, etc." />
            </Field>
            <div style={st.grid2}>
              <Field label="Website"><input style={st.input} type="url" value={profile.website} onChange={setProf('website')} placeholder="https://yourcompany.com" /></Field>
              <Field label="LinkedIn"><input style={st.input} type="url" value={profile.linkedIn} onChange={setProf('linkedIn')} placeholder="https://linkedin.com/company/…" /></Field>
            </div>
            <div style={st.formBtns}>
              <button onClick={saveProfile} style={st.publishBtn}>Save profile</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function FormSection({ title, children }) {
  return (
    <div style={fs.section}>
      <div style={fs.title}>{title}</div>
      {children}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div style={fd.wrap}>
      <label style={fd.label}>{label}</label>
      {hint && <span style={fd.hint}>{hint}</span>}
      {children}
    </div>
  );
}

function Section({ title, badge, badgeStyle, products, onEdit, onToggle, onDelete, emptyMsg }) {
  return (
    <div style={sec.section}>
      <h3 style={sec.heading}>{title} <span style={sec.count}>{products.length}</span></h3>
      {products.length === 0 && <p style={sec.empty}>{emptyMsg}</p>}
      {products.map(p => (
        <div key={p.id} style={sec.row}>
          <span style={badgeStyle}>{badge}</span>
          <div style={sec.info}>
            <span style={sec.name}>{p.name}</span>
            <span style={sec.meta}>{p.category} · {p.material}{p.fireRating ? ` · ${p.fireRating}` : ''}</span>
          </div>
          <div style={sec.btns}>
            <button onClick={() => onEdit(p)} style={sec.editBtn}>Edit</button>
            <button onClick={() => onToggle(p)} style={p.isPublished ? sec.unpublishBtn : sec.publishBtn}>
              {p.isPublished ? 'Unpublish' : 'Publish'}
            </button>
            <button onClick={() => onDelete(p.id)} style={sec.deleteBtn}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

const st = {
  page:       { padding: '24px', maxWidth: '900px', margin: '0 auto' },
  tabBar:     { display: 'flex', gap: '0', marginBottom: '20px', borderBottom: '2px solid #808080' },
  tab:        { padding: '5px 16px', borderTop: '2px solid #d4d0c8', borderLeft: '2px solid #d4d0c8', borderRight: '2px solid #d4d0c8', borderBottom: 'none', background: '#d4d0c8', cursor: 'pointer', fontSize: '0.88rem', color: '#808080', marginBottom: '-2px', fontFamily: 'inherit' },
  tabActive:  { padding: '5px 16px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #d4d0c8', background: '#d4d0c8', cursor: 'pointer', fontSize: '0.88rem', color: '#000000', fontWeight: 700, marginBottom: '-2px', fontFamily: 'inherit' },
  heading:    { fontSize: '1.3rem', fontWeight: 700, marginBottom: '4px', color: '#000000' },
  hint:       { fontSize: '0.85rem', color: '#808080', marginBottom: '16px', marginTop: 0 },
  subheading: { margin: '0 0 12px', fontSize: '0.95rem', fontWeight: 700, color: '#000000' },
  formBox:    { border: '1px solid #9a9790', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', background: '#d4d0c8', padding: '20px', marginBottom: '24px' },
  grid2:      { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', marginBottom: '10px' },
  grid3:      { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px 16px', marginBottom: '10px' },
  input:      { border: '1px solid #9a9790', background: '#ffffff', color: '#000000', padding: '4px 6px', fontSize: '0.88rem', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' },
  formBtns:   { display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' },
  draftBtn:   { padding: '5px 16px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#d4d0c8', color: '#000000', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.88rem' },
  publishBtn: { padding: '5px 16px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#000080', color: '#ffffff', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit', fontSize: '0.88rem' },
  cancelBtn:  { padding: '5px 16px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#d4d0c8', color: '#808080', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.88rem' },
  epdHint:    { fontSize: '0.78rem', color: '#808080', margin: '-2px 0 8px', lineHeight: 1.5 },
  error:      { color: '#c62828', fontSize: '0.85rem', background: '#ffebee', padding: '6px 10px', border: '1px solid #c62828', marginBottom: '12px' },
  success:    { color: '#2e7d32', fontSize: '0.85rem', background: '#e8f5e9', padding: '6px 10px', border: '1px solid #2e7d32', marginBottom: '12px' },
  liveBadge:  { fontSize: '0.7rem', fontWeight: 700, background: '#e8f5e9', color: '#2e7d32', padding: '1px 6px', whiteSpace: 'nowrap', border: '1px solid #2e7d32' },
  draftBadge: { fontSize: '0.7rem', fontWeight: 700, background: '#fff8e1', color: '#f57f17', padding: '1px 6px', whiteSpace: 'nowrap', border: '1px solid #f57f17' },
};

const fs = {
  section: { marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #808080' },
  title:   { fontSize: '0.73rem', fontWeight: 700, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' },
};

const fd = {
  wrap:  { display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '0' },
  label: { fontSize: '0.8rem', color: '#000000', fontWeight: 500 },
  hint:  { fontSize: '0.72rem', color: '#808080', marginTop: '-1px' },
};

const sec = {
  section:      { marginBottom: '24px' },
  heading:      { fontSize: '0.95rem', fontWeight: 700, color: '#000000', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' },
  count:        { background: '#c0c0c0', color: '#000000', fontSize: '0.75rem', padding: '1px 6px', fontWeight: 500 },
  empty:        { color: '#808080', fontSize: '0.85rem' },
  row:          { border: '1px solid #9a9790', background: '#d4d0c8', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' },
  info:         { flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' },
  name:         { fontWeight: 700, fontSize: '0.88rem', color: '#000000' },
  meta:         { fontSize: '0.8rem', color: '#808080' },
  btns:         { display: 'flex', gap: '4px' },
  editBtn:      { padding: '3px 8px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#d4d0c8', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'inherit' },
  publishBtn:   { padding: '3px 8px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#000080', color: '#ffffff', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'inherit' },
  unpublishBtn: { padding: '3px 8px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#d4d0c8', color: '#000000', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'inherit' },
  deleteBtn:    { padding: '3px 8px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#c62828', color: '#ffffff', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'inherit' },
};
