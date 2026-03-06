import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import api from '../services/api';

/**
 * Two modes:
 * • Element-first (from ElementDetail): props = { elementId, elementName, onClose, onAdded? }
 *   → User selects which project to add this element to.
 * • Project-first (from ProjectDetail): props = { projectId, projectGroups, onClose, onAdded? }
 *   → User searches for an element to add to the current project.
 */
export default function AddElementToProjectModal({
  elementId, elementName,
  projectId, projectGroups,
  onClose, onAdded,
}) {
  const isElementFirst = !!elementId;

  // ── Element-first state ──────────────────────────────────────
  const [projects, setProjects]         = useState([]);
  const [selProjectId, setSelProjectId] = useState('');
  const [selGroups, setSelGroups]       = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  // ── Project-first state ──────────────────────────────────────
  const [allElements, setAllElements]     = useState([]);
  const [loadingElements, setLoadingElements] = useState(false);
  const [search, setSearch]               = useState('');
  const [selElement, setSelElement]       = useState(null);

  // ── Shared ───────────────────────────────────────────────────
  const [selGroupId, setSelGroupId]   = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [success, setSuccess]         = useState('');
  const [error, setError]             = useState('');

  // Load projects list (element-first mode)
  useEffect(() => {
    if (isElementFirst) {
      api.get('/projects').then(res => setProjects(res.data))
        .catch(() => setError('Failed to load your projects. Please close and try again.'));
    }
  }, [isElementFirst]);

  // Load groups when project selected (element-first)
  useEffect(() => {
    if (!isElementFirst || !selProjectId) { setSelGroups([]); return; }
    setLoadingGroups(true);
    api.get(`/projects/${selProjectId}`)
      .then(res => setSelGroups(res.data.groups ?? []))
      .catch(() => { setSelGroups([]); setError('Failed to load project subgroups. Please reselect the project.'); })
      .finally(() => setLoadingGroups(false));
  }, [selProjectId, isElementFirst]);

  // Load all elements once on open (project-first mode) — filter client-side
  useEffect(() => {
    if (isElementFirst) return;
    setLoadingElements(true);
    api.get('/elements')
      .then(res => setAllElements(res.data ?? []))
      .catch(() => setError('Failed to load elements. Please close and try again.'))
      .finally(() => setLoadingElements(false));
  }, [isElementFirst]);

  // Derived: filter cached elements by search query
  const searchResults = !isElementFirst && search.trim()
    ? allElements.filter(e => e.name.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 8)
    : [];

  async function handleSubmit() {
    const eid    = isElementFirst ? elementId      : selElement?.id;
    const projId = isElementFirst ? parseInt(selProjectId) : projectId;
    if (!eid || !projId || submitting) return;

    setSubmitting(true);
    setError('');
    try {
      await api.post(`/projects/${projId}/elements`, {
        elementId: eid,
        groupId:   selGroupId ? parseInt(selGroupId) : null,
      });
      const name = isElementFirst ? elementName : selElement?.name;
      setSuccess(`"${name}" added to project.`);
      if (isElementFirst) {
        setSelProjectId(''); setSelGroupId(''); setSelGroups([]);
      } else {
        setSelElement(null); setSearch(''); setSelGroupId('');
      }
      if (onAdded) onAdded();
    } catch (err) {
      setError(err.response?.data?.error ?? 'Failed to add element.');
    } finally {
      setSubmitting(false);
    }
  }

  const BIM7AA = {
    0: 'Generiske objekter', 1: 'Bygningsbasis', 2: 'Primære bygningsdele',
    3: 'Kompletterende bygningsdele', 4: 'Overfladebygningsdele',
    5: 'VVS- og Ventilationsanlæg', 6: 'El- og mekaniske anlæg',
    7: 'Inventar og teknisk udstyr', 8: 'Beplantning og belægning', 9: 'Projektudstyr',
  };

  const groups    = isElementFirst ? selGroups : (projectGroups ?? []);
  const canSubmit = isElementFirst ? (!!selProjectId && !submitting) : (!!selElement && !submitting);

  return (
    <>
      <div style={s.backdrop} onClick={onClose} />
      <div style={s.modal}>
        <div style={s.header}>
          <div style={s.title}>
            {isElementFirst ? `Add "${elementName}" to a project` : 'Add element to project'}
          </div>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={s.body}>
          {success && <div style={s.success}>{success}</div>}
          {error   && <div style={s.error}>{error}</div>}

          {isElementFirst ? (
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
            /* ── Search for an element ── */
            <>
              <div style={s.field}>
                <label style={s.label}>Search for an element</label>
                {selElement ? (
                  <div style={s.selectedItem}>
                    <div style={s.selectedInfo}>
                      <span style={s.selectedName}>{selElement.name}</span>
                      <span style={s.selectedMeta}>{BIM7AA[selElement.bim7aaCategory]} · {selElement.productCount} products</span>
                    </div>
                    <button style={s.clearSel} onClick={() => { setSelElement(null); setSearch(''); setSuccess(''); setError(''); }}>Change</button>
                  </div>
                ) : (
                  <>
                    <input
                      style={s.input}
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Type to search your elements…"
                      autoFocus
                    />
                    {loadingElements && <span style={s.muted}>Loading elements…</span>}
                    {!loadingElements && search.trim() && searchResults.length === 0 && (
                      <span style={s.muted}>No elements found.</span>
                    )}
                    {searchResults.length > 0 && (
                      <div style={s.results}>
                        {searchResults.map(el => (
                          <button key={el.id} style={s.resultItem}
                            onClick={() => { setSelElement(el); setSearch(''); }}
                          >
                            <span style={s.resultName}>{el.name}</span>
                            <span style={s.resultMeta}>{BIM7AA[el.bim7aaCategory]} · {el.productCount} products</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
              {selElement && groups.length > 0 && (
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

AddElementToProjectModal.propTypes = {
  elementId: PropTypes.number,
  elementName: PropTypes.string,
  projectId: PropTypes.number,
  projectGroups: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
  })),
  onClose: PropTypes.func.isRequired,
  onAdded: PropTypes.func,
};

const s = {
  backdrop:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 },
  modal:       { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#d4d0c8', border: '1px solid #9a9790', boxShadow: '0 4px 16px rgba(0,0,0,0.35)', zIndex: 201, width: '480px', maxWidth: '95vw', display: 'flex', flexDirection: 'column', maxHeight: '90vh' },
  header:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 6px', background: 'linear-gradient(90deg, #000080 0%, #1084d0 100%)', flexShrink: 0 },
  title:       { fontWeight: 700, fontSize: '0.88rem', color: '#ffffff', paddingRight: '10px', letterSpacing: '0.01em' },
  closeBtn:    { borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#d4d0c8', cursor: 'pointer', color: '#000000', fontSize: '0.8rem', padding: '0px 5px', lineHeight: '16px', flexShrink: 0, fontFamily: 'inherit' },
  body:        { padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' },
  footer:      { display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '10px 16px', borderTop: '1px solid #808080', flexShrink: 0 },
  field:       { display: 'flex', flexDirection: 'column', gap: '4px' },
  label:       { fontSize: '0.78rem', fontWeight: 700, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.04em' },
  select:      { border: '1px solid #9a9790', background: '#ffffff', color: '#000000', padding: '4px 8px', fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit', outline: 'none' },
  input:       { border: '1px solid #9a9790', background: '#ffffff', color: '#000000', padding: '4px 8px', fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit' },
  muted:       { fontSize: '0.82rem', color: '#808080' },
  hint:        { fontSize: '0.85rem', color: '#808080', margin: 0 },
  results:     { border: '1px solid #9a9790', overflow: 'hidden', maxHeight: '200px', overflowY: 'auto', background: '#ffffff' },
  resultItem:  { display: 'flex', flexDirection: 'column', gap: '2px', width: '100%', padding: '7px 10px', background: 'none', border: 'none', borderBottom: '1px solid #e0ddd4', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' },
  resultName:  { fontWeight: 700, fontSize: '0.88rem', color: '#000000' },
  resultMeta:  { fontSize: '0.75rem', color: '#808080' },
  selectedItem:  { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', border: '1px solid #9a9790', background: '#ffffff' },
  selectedInfo:  { display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 },
  selectedName:  { fontWeight: 700, fontSize: '0.88rem', color: '#000000' },
  selectedMeta:  { fontSize: '0.75rem', color: '#808080' },
  clearSel:      { background: 'none', border: 'none', cursor: 'pointer', color: '#000080', fontSize: '0.78rem', textDecoration: 'underline', padding: 0, flexShrink: 0, fontFamily: 'inherit' },
  success:     { background: '#e8f5e9', color: '#2e7d32', padding: '8px 12px', border: '1px solid #2e7d32', fontSize: '0.85rem', fontWeight: 700 },
  error:       { background: '#ffe0e0', color: '#c00000', padding: '8px 12px', border: '1px solid #c00000', fontSize: '0.85rem' },
  cancelBtn:   { padding: '5px 16px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#d4d0c8', color: '#000000', cursor: 'pointer', fontSize: '0.88rem', fontFamily: 'inherit' },
  addBtn:      { padding: '5px 16px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#000080', color: '#ffffff', fontWeight: 700, fontSize: '0.88rem', fontFamily: 'inherit' },
};
