import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import AddToProjectModal from '../components/AddToProjectModal';
import { safeHref } from '../utils/safeHref';

export default function ProductDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  const [product, setProduct] = useState(null);
  const [savedId, setSavedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    api.get(`/products/${id}`)
      .then(res => setProduct(res.data))
      .catch(err => { if (err.response?.status === 404) setNotFound(true); })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (user?.role === 'Architect') {
      api.get('/saved')
        .then(res => {
          const match = res.data.find(s => s.product.id === parseInt(id));
          if (match) setSavedId(match.savedId);
        })
        .catch(() => console.error('Failed to load saved product status.'));
    }
  }, [user, id]);

  async function handleSave() {
    setBusy(true);
    try {
      const res = await api.post('/saved', { productId: product.id });
      setSavedId(res.data.id);
    } catch (e) { setActionError(e.response?.data?.error ?? 'Failed to save.'); }
    finally { setBusy(false); }
  }

  async function handleUnsave() {
    setBusy(true);
    try {
      await api.delete(`/saved/${savedId}`);
      setSavedId(null);
    } catch { setActionError('Failed to unsave.'); }
    finally { setBusy(false); }
  }

  if (loading)  return <div style={s.state}>Loading...</div>;
  if (notFound) return (
    <div style={s.state}>
      <p>Product not found.</p>
      <Link to="/" style={s.backLink}>← Back to Browse</Link>
    </div>
  );

  const p = product;

  const hasEpd  = p.gwpA1A3 != null || p.gwpB4 != null || p.gwpB6 != null || p.gwpC3 != null || p.gwpC4 != null || p.epdUrl;
  const hasFire = p.fireRating || p.fireResistance || p.fireCertificateUrl;
  const hasPhys = p.weightPerUnit != null || p.thickness != null || p.width != null ||
                  p.height != null || p.length != null || p.thermalPerformance;
  const hasSound = p.soundReductionRw != null || p.soundReductionRwCCtr != null ||
                   p.soundAbsorptionAlphaW != null || p.acousticRating;

  // All document URLs in one list for the Documents card
  const docs = [
    p.datasheetUrl          && { href: p.datasheetUrl,          icon: '📄', label: 'Produktdatablad',           desc: 'Technical datasheet — specifications, dimensions, fixing details' },
    p.epdUrl                && { href: p.epdUrl,                icon: '🌱', label: 'EPD',                        desc: 'Environmental Product Declaration (EN 15804 · ISO 14025)' },
    p.installationGuideUrl  && { href: p.installationGuideUrl,  icon: '🔧', label: 'Installationsvejledning',    desc: 'Step-by-step installation instructions' },
    p.fireCertificateUrl    && { href: p.fireCertificateUrl,    icon: '🔥', label: 'Brandcertifikat',            desc: 'Fire test report / certification document' },
    p.soundTestReportUrl    && { href: p.soundTestReportUrl,    icon: '🔊', label: 'Lydmålingsrapport',          desc: 'Acoustic test report' },
    p.ceDeclarationUrl      && { href: p.ceDeclarationUrl,      icon: '🏷', label: 'CE Declaration of Performance', desc: 'DoP — EU regulatory compliance document' },
    p.bimUrl                && { href: p.bimUrl,                icon: '🧱', label: 'BIM Object',                 desc: 'Revit / IFC / ArchiCAD compatible' },
  ].filter(Boolean);


  function gwpColour(v) {
    if (v < 0)   return { color: '#2e7d32', bg: '#e8f5e9' };
    if (v < 50)  return { color: '#1565c0', bg: '#e3f2fd' };
    if (v < 150) return { color: '#e65100', bg: '#fff3e0' };
    return               { color: '#c62828', bg: '#ffebee' };
  }

  return (
    <div style={s.page}>

      {/* Back link */}
      <Link to="/" style={s.back}>← Back to Browse</Link>

      {/* ── Header ── */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <div style={s.chips}>
            <span style={s.categoryChip}>{p.category}</span>
            {hasEpd   && <span style={s.epdChip}>EPD</span>}
            {hasFire  && <span style={s.fireChip}>Brand</span>}
            {hasSound && <span style={s.soundChip}>Akustik</span>}
          </div>
          <h1 style={s.title}>{p.name}</h1>
          <div style={s.byline}>
            <span>By </span>
            <Link to={`/manufacturer/${p.manufacturerId}`} style={s.mfrLink}>
              {p.manufacturerName}
            </Link>
            {p.declaredUnit && (
              <span style={s.declaredUnit}> · {p.declaredUnit}</span>
            )}
          </div>
          <p style={s.description}>{p.description}</p>
        </div>

        {user?.role === 'Architect' && (
          <div style={s.headerRight}>
            <button style={s.addProjectBtn} onClick={() => setShowProjectModal(true)}>+ Add to project</button>
            {savedId
              ? <button style={s.savedBtn} disabled={busy} onClick={handleUnsave}>✓ Saved</button>
              : <button style={s.saveBtn}  disabled={busy} onClick={handleSave}>Save product</button>
            }
            {actionError && <div style={s.actionError}>{actionError}</div>}
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div style={s.body}>

        {/* ── Left column ── */}
        <div style={s.left}>

          {/* General technical specs */}
          <div style={s.card}>
            <h2 style={s.cardTitle}>Technical Specifications</h2>
            <table style={s.specTable}>
              <tbody>
                <SpecRow label="Material"        value={p.material} />
                <SpecRow label="Declared unit"   value={p.declaredUnit} />
                <SpecRow label="Certifications"  value={p.certifications} />
              </tbody>
            </table>
          </div>

          {/* Fire */}
          {hasFire && (
            <div style={s.card}>
              <h2 style={s.cardTitle}>
                Brandegenskaber
                <span style={{ ...s.isoNote, background: '#ffcdd2', color: '#b71c1c', borderColor: '#b71c1c' }}>EN 13501</span>
              </h2>
              <table style={s.specTable}>
                <tbody>
                  <SpecRow
                    label="Brandklasse (Euroclass)"
                    value={p.fireRating}
                    badge={p.fireRating ? { text: p.fireRating, color: fireRatingColour(p.fireRating) } : null}
                  />
                  <SpecRow label="Brandmodstand" value={p.fireResistance}
                    badge={p.fireResistance ? { text: p.fireResistance, color: { text: '#b71c1c', bg: '#ffebee' } } : null}
                  />
                </tbody>
              </table>
              {p.fireCertificateUrl && (
                <div style={s.inlineDocRow}>
                  <DocLink href={safeHref(p.fireCertificateUrl)} label="Brandcertifikat" desc="Fire test report / certification document" />
                </div>
              )}
            </div>
          )}

          {/* Physical + Thermal */}
          {hasPhys && (
            <div style={s.card}>
              <h2 style={s.cardTitle}>Fysiske egenskaber</h2>
              {/* Dimension grid */}
              {(p.thickness != null || p.width != null || p.height != null || p.length != null || p.weightPerUnit != null) && (
                <div style={s.dimGrid}>
                  {p.thickness    != null && <DimBox label="Tykkelse"  value={p.thickness}    unit="mm" />}
                  {p.width        != null && <DimBox label="Bredde"    value={p.width}        unit="mm" />}
                  {p.height       != null && <DimBox label="Højde"     value={p.height}       unit="mm" />}
                  {p.length       != null && <DimBox label="Længde"    value={p.length}       unit="mm" />}
                  {p.weightPerUnit != null && <DimBox label="Vægt"     value={p.weightPerUnit} unit="kg" />}
                </div>
              )}
              {p.thermalPerformance && (
                <table style={{ ...s.specTable, marginTop: '10px' }}>
                  <tbody>
                    <SpecRow label="Termisk ydelse" value={p.thermalPerformance} />
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Sound */}
          {hasSound && (
            <div style={s.card}>
              <h2 style={s.cardTitle}>
                Lydegenskaber
                <span style={{ ...s.isoNote, background: '#e3f2fd', color: '#1565c0', borderColor: '#1565c0' }}>ISO 717</span>
              </h2>
              <table style={s.specTable}>
                <tbody>
                  {p.soundReductionRw != null && (
                    <tr>
                      <td style={sr.label}>Lydreduktion R<sub>w</sub></td>
                      <td style={sr.value}>
                        <span style={s.dbChip}>{p.soundReductionRw} dB</span>
                        {p.soundReductionRwCCtr != null && (
                          <span style={s.dbMeta}>(C; Ctr) = {p.soundReductionRwCCtr} dB</span>
                        )}
                      </td>
                    </tr>
                  )}
                  {p.soundAbsorptionAlphaW != null && (
                    <tr>
                      <td style={sr.label}>Lydabsorption α<sub>w</sub></td>
                      <td style={sr.value}>
                        <span style={s.dbChip}>{Number(p.soundAbsorptionAlphaW).toFixed(2)}</span>
                        <AbsorptionBar value={parseFloat(p.soundAbsorptionAlphaW)} />
                      </td>
                    </tr>
                  )}
                  {p.acousticRating && <SpecRow label="Akustisk vurdering" value={p.acousticRating} />}
                </tbody>
              </table>
              {p.soundTestReportUrl && (
                <div style={s.inlineDocRow}>
                  <DocLink href={safeHref(p.soundTestReportUrl)} label="Lydmålingsrapport" desc="Acoustic test report" />
                </div>
              )}
            </div>
          )}

          {/* EPD */}
          {hasEpd && (
            <div style={s.card}>
              <h2 style={s.cardTitle}>
                Environmental Product Declaration
                <span style={s.isoNote}>EN 15804 · ISO 14025</span>
              </h2>
              <p style={s.gwpIntro}>
                Global Warming Potential (GWP) in kg CO₂ eq {p.declaredUnit ? `· ${p.declaredUnit}` : ''}
              </p>
              <table style={s.gwpTable}>
                <thead>
                  <tr>
                    <th style={s.gwpTh}>Stage</th>
                    <th style={s.gwpTh}>Description</th>
                    <th style={{ ...s.gwpTh, textAlign: 'right' }}>GWP (kg CO₂ eq)</th>
                  </tr>
                </thead>
                <tbody>
                  <GwpRow stage="A1–A3" desc="Product stage (extraction, transport, manufacturing)" value={p.gwpA1A3} gwpColour={gwpColour} />
                  <GwpRow stage="B4"    desc="Replacement (use phase)"                             value={p.gwpB4}   gwpColour={gwpColour} />
                  <GwpRow stage="B6"    desc="Operational energy use"                              value={p.gwpB6}   gwpColour={gwpColour} />
                  <GwpRow stage="C3"    desc="Waste processing (end of life)"                      value={p.gwpC3}   gwpColour={gwpColour} />
                  <GwpRow stage="C4"    desc="Disposal (end of life)"                              value={p.gwpC4}   gwpColour={gwpColour} />
                </tbody>
              </table>
              {(p.gwpA1A3 != null && p.gwpA1A3 < 0) && (
                <p style={s.gwpNote}>
                  Negative values indicate biogenic carbon sequestration — this product stores more carbon than it emits during production.
                </p>
              )}
            </div>
          )}

        </div>

        {/* ── Right column ── */}
        <div style={s.right}>

          {/* Documents */}
          <div style={s.card}>
            <h2 style={s.cardTitle}>Dokumenter & Downloads</h2>
            {docs.length > 0 ? (
              <div style={s.docList}>
                {docs.map((d, i) => (
                  <DocLink key={i} href={safeHref(d.href)} icon={d.icon} label={d.label} desc={d.desc} />
                ))}
              </div>
            ) : (
              <div style={s.noDocsInner}>
                <p style={s.noDocs}>No documents uploaded yet.</p>
                <p style={s.noDocsHint}>Contact the manufacturer directly for technical documentation.</p>
              </div>
            )}
          </div>

          {/* Manufacturer */}
          <div style={s.card}>
            <h2 style={s.cardTitle}>Manufacturer</h2>
            <Link to={`/manufacturer/${p.manufacturerId}`} style={s.mfrCard}>
              <div style={s.mfrAvatar}>
                {(p.manufacturerName ?? '?').charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={s.mfrName}>{p.manufacturerName}</div>
                <div style={s.mfrCta}>View company profile →</div>
              </div>
            </Link>
          </div>

        </div>

      </div>

      {showProjectModal && (
        <AddToProjectModal
          productId={p.id}
          productName={p.name}
          onClose={() => setShowProjectModal(false)}
        />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SpecRow({ label, value, badge }) {
  if (!value && !badge) return null;
  return (
    <tr>
      <td style={sr.label}>{label}</td>
      <td style={sr.value}>
        {badge
          ? <span style={{ ...sr.badge, color: badge.color.text, background: badge.color.bg }}>{badge.text}</span>
          : value}
      </td>
    </tr>
  );
}

function GwpRow({ stage, desc, value, gwpColour }) {
  if (value == null) return null;
  const c = gwpColour(value);
  const formatted = value < 0 ? `${value}` : `+${value}`;
  return (
    <tr>
      <td style={gr.stage}>{stage}</td>
      <td style={gr.desc}>{desc}</td>
      <td style={gr.val}>
        <span style={{ ...gr.chip, color: c.color, background: c.bg }}>{formatted}</span>
      </td>
    </tr>
  );
}

function DimBox({ label, value, unit }) {
  return (
    <div style={db.box}>
      <div style={db.value}>{Number(value).toLocaleString('da-DK', { maximumFractionDigits: 1 })}</div>
      <div style={db.unit}>{unit}</div>
      <div style={db.label}>{label}</div>
    </div>
  );
}

function AbsorptionBar({ value }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const color = value >= 0.8 ? '#2e7d32' : value >= 0.5 ? '#1565c0' : value >= 0.3 ? '#e65100' : '#808080';
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginLeft: '8px', verticalAlign: 'middle' }}>
      <div style={{ width: '80px', height: '8px', background: '#c0c0c0', border: '1px solid #808080', borderRadius: 0 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color }} />
      </div>
    </div>
  );
}

function DocLink({ href, icon, label, desc }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={dl.link}>
      {icon && <span style={dl.icon}>{icon}</span>}
      <div style={dl.body}>
        <div style={dl.label}>{label}</div>
        <div style={dl.desc}>{desc}</div>
      </div>
      <span style={dl.arrow}>↗</span>
    </a>
  );
}

SpecRow.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  badge: PropTypes.shape({
    text: PropTypes.string.isRequired,
    color: PropTypes.shape({
      text: PropTypes.string.isRequired,
      bg: PropTypes.string.isRequired,
    }).isRequired,
  }),
};

GwpRow.propTypes = {
  stage: PropTypes.string.isRequired,
  desc: PropTypes.string.isRequired,
  value: PropTypes.number,
  gwpColour: PropTypes.func.isRequired,
};

DimBox.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  unit: PropTypes.string.isRequired,
};

AbsorptionBar.propTypes = {
  value: PropTypes.number.isRequired,
};

DocLink.propTypes = {
  href: PropTypes.string.isRequired,
  icon: PropTypes.string,
  label: PropTypes.string.isRequired,
  desc: PropTypes.string.isRequired,
};

function fireRatingColour(rating) {
  const r = (rating ?? '').toUpperCase();
  if (r.startsWith('A1'))  return { text: '#1b5e20', bg: '#e8f5e9' };
  if (r.startsWith('A2'))  return { text: '#2e7d32', bg: '#f1f8e9' };
  if (r.startsWith('B'))   return { text: '#e65100', bg: '#fff3e0' };
  if (r.startsWith('C'))   return { text: '#bf360c', bg: '#fbe9e7' };
  if (r.startsWith('DFL')) return { text: '#6a1a1a', bg: '#ffebee' };
  return                          { text: '#555',    bg: '#f5f5f5' };
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  page:          { maxWidth: '1100px', margin: '0 auto', padding: '24px 24px 48px' },
  state:         { textAlign: 'center', padding: '60px', color: '#808080' },
  back:          { display: 'inline-block', fontSize: '0.85rem', color: '#000080', textDecoration: 'none', marginBottom: '18px' },
  backLink:      { color: '#000080', fontSize: '0.9rem' },

  // Header
  header:        { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px', marginBottom: '22px', border: '1px solid #9a9790', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', background: '#d4d0c8', padding: '20px 24px' },
  headerLeft:    { flex: 1 },
  headerRight:   { flexShrink: 0, paddingTop: '4px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' },
  addProjectBtn: { padding: '5px 16px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#d4d0c8', color: '#000000', cursor: 'pointer', fontWeight: 500, fontSize: '0.88rem', whiteSpace: 'nowrap', fontFamily: 'inherit' },
  chips:         { display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' },
  categoryChip:  { fontSize: '0.72rem', background: '#c0c0c0', color: '#000000', padding: '1px 8px', fontWeight: 500, border: '1px solid #808080' },
  epdChip:       { fontSize: '0.72rem', background: '#e8f5e9', color: '#2e7d32', padding: '1px 8px', fontWeight: 700, border: '1px solid #2e7d32' },
  fireChip:      { fontSize: '0.72rem', background: '#ffebee', color: '#b71c1c', padding: '1px 8px', fontWeight: 700, border: '1px solid #b71c1c' },
  soundChip:     { fontSize: '0.72rem', background: '#e3f2fd', color: '#1565c0', padding: '1px 8px', fontWeight: 700, border: '1px solid #1565c0' },
  title:         { margin: '0 0 8px', fontSize: '1.6rem', fontWeight: 700, color: '#000000', lineHeight: 1.2 },
  byline:        { fontSize: '0.9rem', color: '#404040', marginBottom: '12px' },
  mfrLink:       { color: '#000080', textDecoration: 'none', fontWeight: 600 },
  declaredUnit:  { color: '#808080' },
  description:   { margin: 0, fontSize: '0.92rem', color: '#404040', lineHeight: 1.7 },
  saveBtn:       { padding: '5px 16px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#000080', color: '#ffffff', cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem', whiteSpace: 'nowrap', fontFamily: 'inherit' },
  savedBtn:      { padding: '5px 16px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#d4d0c8', color: '#2e7d32', cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem', whiteSpace: 'nowrap', fontFamily: 'inherit' },
  actionError:   { color: '#c00000', fontSize: '0.8rem', background: '#ffe0e0', border: '1px solid #c62828', padding: '4px 8px', maxWidth: '180px', textAlign: 'right' },

  // Layout
  body:          { display: 'grid', gridTemplateColumns: '1fr 300px', gap: '18px', alignItems: 'start' },
  left:          { display: 'flex', flexDirection: 'column', gap: '18px' },
  right:         { display: 'flex', flexDirection: 'column', gap: '18px' },

  // Card
  card:          { border: '1px solid #9a9790', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', background: '#d4d0c8', padding: '18px 20px' },
  cardTitle:     { margin: '0 0 14px', fontSize: '0.92rem', fontWeight: 700, color: '#000000', display: 'flex', alignItems: 'center', gap: '10px' },
  isoNote:       { fontSize: '0.7rem', color: '#808080', fontWeight: 400, background: '#c0c0c0', padding: '1px 6px', border: '1px solid #808080' },

  specTable:     { width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' },

  // Dimension grid
  dimGrid:       { display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '4px' },

  // Sound
  dbChip:        { display: 'inline-block', background: '#c0c0c0', border: '1px solid #808080', padding: '1px 8px', fontWeight: 700, fontSize: '0.82rem', color: '#000000' },
  dbMeta:        { marginLeft: '8px', fontSize: '0.78rem', color: '#808080' },

  // Inline doc row inside a card (below the spec table)
  inlineDocRow:  { marginTop: '12px' },

  // EPD
  gwpIntro:      { fontSize: '0.8rem', color: '#808080', margin: '0 0 10px', lineHeight: 1.5 },
  gwpTable:      { width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' },
  gwpTh:         { padding: '5px 10px', background: '#c0c0c0', borderBottom: '1px solid #9a9790', fontWeight: 700, fontSize: '0.72rem', color: '#000000', textAlign: 'left' },
  gwpNote:       { margin: '10px 0 0', fontSize: '0.78rem', color: '#404040', background: '#c0c0c0', padding: '7px 10px', lineHeight: 1.5, border: '1px solid #808080' },

  // Documents (right col)
  docList:       { display: 'flex', flexDirection: 'column', gap: '6px' },
  noDocsInner:   { textAlign: 'center', padding: '8px 0' },
  noDocs:        { margin: '0 0 6px', color: '#808080', fontWeight: 500, fontSize: '0.88rem' },
  noDocsHint:    { margin: 0, fontSize: '0.78rem', color: '#808080' },

  // Manufacturer
  mfrCard:       { display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', padding: '10px', border: '1px solid #9a9790', background: '#ffffff' },
  mfrAvatar:     { width: '38px', height: '38px', background: '#000080', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1rem', flexShrink: 0 },
  mfrName:       { fontWeight: 700, color: '#000000', fontSize: '0.9rem' },
  mfrCta:        { fontSize: '0.8rem', color: '#000080', marginTop: '2px' },
};

const sr = {
  label:   { padding: '6px 14px 6px 0', fontSize: '0.82rem', color: '#808080', fontWeight: 500, whiteSpace: 'nowrap', verticalAlign: 'middle', width: '160px', borderBottom: '1px solid #c0c0c0' },
  value:   { padding: '6px 0', fontSize: '0.88rem', color: '#000000', borderBottom: '1px solid #c0c0c0', lineHeight: 1.5, verticalAlign: 'middle' },
  badge:   { display: 'inline-block', padding: '1px 8px', fontWeight: 700, fontSize: '0.82rem' },
};

const gr = {
  stage: { padding: '7px 10px', borderBottom: '1px solid #c0c0c0', fontWeight: 700, fontSize: '0.8rem', color: '#000000', whiteSpace: 'nowrap', width: '52px' },
  desc:  { padding: '7px 10px', borderBottom: '1px solid #c0c0c0', fontSize: '0.82rem', color: '#404040' },
  val:   { padding: '7px 10px', borderBottom: '1px solid #c0c0c0', textAlign: 'right', whiteSpace: 'nowrap' },
  chip:  { display: 'inline-block', padding: '1px 8px', fontWeight: 700, fontSize: '0.82rem', border: '1px solid currentColor' },
};

const db = {
  box:   { border: '1px solid #9a9790', background: '#ffffff', padding: '8px 14px', textAlign: 'center', minWidth: '70px' },
  value: { fontSize: '1.15rem', fontWeight: 700, color: '#000000', lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' },
  unit:  { fontSize: '0.7rem', color: '#808080', fontWeight: 500, marginTop: '1px' },
  label: { fontSize: '0.68rem', color: '#808080', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' },
};

const dl = {
  link:  { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', border: '1px solid #9a9790', background: '#c0c0c0', textDecoration: 'none', color: 'inherit' },
  icon:  { fontSize: '1rem', flexShrink: 0, lineHeight: 1 },
  body:  { flex: 1, minWidth: 0 },
  label: { fontWeight: 700, fontSize: '0.85rem', color: '#000000', marginBottom: '1px' },
  desc:  { fontSize: '0.74rem', color: '#404040', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  arrow: { marginLeft: 'auto', color: '#808080', fontSize: '0.9rem', flexShrink: 0 },
};
