import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [invites, setInvites]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ name: '', description: '', location: '' });
  const [error, setError]       = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [projRes, invRes] = await Promise.all([
        api.get('/projects'),
        api.get('/projects/invites'),
      ]);
      setProjects(projRes.data);
      setInvites(invRes.data);
    } catch {}
    finally { setLoading(false); }
  }

  function setF(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })); }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setError('');
    try {
      const res = await api.post('/projects', form);
      setProjects(ps => [res.data, ...ps]);
      setForm({ name: '', description: '', location: '' });
      setShowForm(false);
    } catch (err) { setError(err.response?.data?.error ?? 'Failed to create project.'); }
  }

  async function handleDelete(id, e) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Delete this project and all its product assignments?')) return;
    try {
      await api.delete(`/projects/${id}`);
      setProjects(ps => ps.filter(p => p.id !== id));
    } catch { alert('Failed to delete project.'); }
  }

  async function handleAccept(projectId) {
    try {
      await api.post(`/projects/invites/${projectId}/accept`);
      setInvites(iv => iv.filter(i => i.projectId !== projectId));
      const res = await api.get('/projects');
      setProjects(res.data);
    } catch { alert('Failed to accept invite.'); }
  }

  async function handleDecline(projectId) {
    try {
      await api.delete(`/projects/invites/${projectId}`);
      setInvites(iv => iv.filter(i => i.projectId !== projectId));
    } catch { alert('Failed to decline invite.'); }
  }

  return (
    <div style={s.page}>
      <div style={s.topBar}>
        <div>
          <h1 style={s.heading}>Projects</h1>
          <p style={s.sub}>Organise products by construction project and subgroup.</p>
        </div>
        <button style={s.newBtn} onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Cancel' : '+ New project'}
        </button>
      </div>

      {invites.length > 0 && (
        <div style={s.inviteBanner}>
          <div style={s.inviteTitle}>Pending invitations ({invites.length})</div>
          {invites.map(inv => (
            <div key={inv.projectId} style={s.inviteRow}>
              <span style={s.inviteText}>
                <strong>{inv.projectName}</strong> &mdash; invited by <em>{inv.ownerUsername}</em>
              </span>
              <div style={s.inviteBtns}>
                <button style={s.acceptBtn} onClick={() => handleAccept(inv.projectId)}>Accept</button>
                <button style={s.declineBtn} onClick={() => handleDecline(inv.projectId)}>Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <form style={s.formBox} onSubmit={handleCreate}>
          <h3 style={s.formTitle}>New Project</h3>
          {error && <div style={s.error}>{error}</div>}
          <div style={s.grid2}>
            <div style={s.field}>
              <label style={s.label}>Project name *</label>
              <input style={s.input} value={form.name} onChange={setF('name')} autoFocus placeholder="e.g. London Office Fit-out" />
            </div>
            <div style={s.field}>
              <label style={s.label}>Location</label>
              <input style={s.input} value={form.location} onChange={setF('location')} placeholder="e.g. London, UK" />
            </div>
          </div>
          <div style={s.field}>
            <label style={s.label}>Description</label>
            <textarea style={{ ...s.input, height: '64px', resize: 'vertical', fontFamily: 'inherit' }}
              value={form.description} onChange={setF('description')}
              placeholder="Brief description of the project" />
          </div>
          <div style={s.formBtns}>
            <button type="submit" style={s.createBtn}>Create project</button>
            <button type="button" style={s.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {loading && <p style={s.msg}>Loading...</p>}
      {!loading && projects.length === 0 && !showForm && (
        <div style={s.empty}>
          <p style={s.emptyTitle}>No projects yet</p>
          <p style={s.emptySub}>Create a project to start organising products by job.</p>
          <button style={s.createBtn} onClick={() => setShowForm(true)}>+ New project</button>
        </div>
      )}

      {!loading && projects.length > 0 && (
        <div style={s.grid}>
          {projects.map(p => (
            <Link key={p.id} to={`/projects/${p.id}`} style={s.card}>
              <div style={s.cardTop}>
                <div>
                  <div style={s.cardName}>{p.name}</div>
                  {p.location && <div style={s.cardLocation}>{p.location}</div>}
                </div>
                {p.isOwner && (
                  <button
                    style={s.deleteBtn}
                    onClick={e => handleDelete(p.id, e)}
                    title="Delete project"
                  >✕</button>
                )}
              </div>
              {p.description && <p style={s.cardDesc}>{p.description}</p>}
              <div style={s.cardMeta}>
                <span style={s.metaBadge}>{p.productCount} product{p.productCount !== 1 ? 's' : ''}</span>
                {p.groupCount > 0 && (
                  <span style={s.metaBadge}>{p.groupCount} group{p.groupCount !== 1 ? 's' : ''}</span>
                )}
                {p.memberCount > 0 && (
                  <span style={s.metaBadge}>{p.memberCount + 1} member{p.memberCount + 1 !== 1 ? 's' : ''}</span>
                )}
                {!p.isOwner && <span style={s.sharedBadge}>Shared</span>}
                <span style={s.metaDate}>{new Date(p.createdDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

const s = {
  page:        { padding: '24px', maxWidth: '1000px', margin: '0 auto' },
  topBar:      { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
  heading:     { fontSize: '1.4rem', fontWeight: 700, margin: 0, color: '#000000' },
  sub:         { fontSize: '0.85rem', color: '#808080', marginTop: '4px', marginBottom: 0 },
  newBtn:      { padding: '5px 16px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#000080', color: '#ffffff', cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem', flexShrink: 0, fontFamily: 'inherit' },

  // Invite banner
  inviteBanner: { border: '1px solid #9a9790', background: '#fffbe6', padding: '12px 16px', marginBottom: '18px' },
  inviteTitle:  { fontWeight: 700, fontSize: '0.88rem', marginBottom: '8px', color: '#000000' },
  inviteRow:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderTop: '1px solid #e0ddd5', gap: '12px', flexWrap: 'wrap' },
  inviteText:   { fontSize: '0.88rem', color: '#000000' },
  inviteBtns:   { display: 'flex', gap: '6px', flexShrink: 0 },
  acceptBtn:    { padding: '3px 12px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#000080', color: '#ffffff', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem' },
  declineBtn:   { padding: '3px 12px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#d4d0c8', color: '#000000', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem' },

  // Form
  formBox:     { border: '1px solid #9a9790', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', background: '#d4d0c8', padding: '18px 20px', marginBottom: '20px' },
  formTitle:   { margin: '0 0 14px', fontSize: '0.95rem', fontWeight: 700, color: '#000000' },
  grid2:       { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 18px', marginBottom: '10px' },
  field:       { display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '10px' },
  label:       { fontSize: '0.78rem', color: '#000000', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' },
  input:       { border: '1px solid #9a9790', background: '#ffffff', color: '#000000', padding: '4px 8px', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' },
  formBtns:    { display: 'flex', gap: '8px', marginTop: '6px' },
  createBtn:   { padding: '5px 16px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#000080', color: '#ffffff', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit', fontSize: '0.88rem' },
  cancelBtn:   { padding: '5px 16px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#d4d0c8', color: '#000000', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.88rem' },
  error:       { color: '#c00000', fontSize: '0.85rem', background: '#ffe0e0', border: '1px solid #c62828', padding: '6px 10px', marginBottom: '10px' },

  // Empty state
  empty:       { textAlign: 'center', padding: '60px 0' },
  emptyTitle:  { fontSize: '1rem', fontWeight: 700, color: '#000000', margin: '0 0 8px' },
  emptySub:    { color: '#808080', fontSize: '0.88rem', marginBottom: '20px' },
  msg:         { color: '#808080', textAlign: 'center', padding: '40px 0' },

  // Cards grid
  grid:        { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' },
  card:        { border: '1px solid #9a9790', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', background: '#d4d0c8', padding: '14px', textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '8px', cursor: 'pointer', color: 'inherit' },
  cardTop:     { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' },
  cardName:    { fontWeight: 700, fontSize: '0.95rem', color: '#000000' },
  cardLocation:{ fontSize: '0.78rem', color: '#808080', marginTop: '2px' },
  cardDesc:    { fontSize: '0.83rem', color: '#404040', margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  cardMeta:    { display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginTop: '2px' },
  metaBadge:   { fontSize: '0.72rem', background: '#c0c0c0', color: '#000000', padding: '1px 6px', border: '1px solid #808080', fontWeight: 500 },
  sharedBadge: { fontSize: '0.72rem', background: '#000080', color: '#ffffff', padding: '1px 6px', border: '1px solid #000060', fontWeight: 500 },
  metaDate:    { fontSize: '0.72rem', color: '#808080', marginLeft: 'auto' },
  deleteBtn:   { borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#d4d0c8', cursor: 'pointer', color: '#000000', fontSize: '0.8rem', padding: '1px 6px', lineHeight: 1, flexShrink: 0, fontFamily: 'inherit' },
};
