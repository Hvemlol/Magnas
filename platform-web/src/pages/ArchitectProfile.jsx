import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

function safeHref(url) {
  if (!url) return '#';
  return url.startsWith('http') ? url : `https://${url}`;
}

function joinYear(dateStr) {
  return new Date(dateStr).getFullYear();
}

export default function ArchitectProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState({ companyName: '', bio: '', location: '', website: '', linkedIn: '' });
  const [saving, setSaving]   = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await api.get('/profile');
      setProfile(res.data);
    } catch {}
    finally { setLoading(false); }
  }

  function startEdit() {
    setForm({
      companyName: profile.companyName ?? '',
      bio:         profile.bio         ?? '',
      location:    profile.location    ?? '',
      website:     profile.website     ?? '',
      linkedIn:    profile.linkedIn    ?? '',
    });
    setSaveError('');
    setEditing(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    try {
      const res = await api.put('/profile', {
        companyName: form.companyName || null,
        bio:         form.bio         || null,
        location:    form.location    || null,
        website:     form.website     || null,
        linkedIn:    form.linkedIn    || null,
      });
      setProfile(p => ({ ...p, ...res.data }));
      setEditing(false);
    } catch {
      setSaveError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={s.state}>Loading…</div>;
  if (!profile) return <div style={s.state}>Could not load profile.</div>;

  const displayName = profile.companyName ?? profile.username;
  const initial     = displayName.charAt(0).toUpperCase();

  return (
    <div style={s.page}>

      {/* ── Hero card ── */}
      <div style={s.hero}>
        <div style={s.avatarWrap}>
          <div style={s.avatar}>{initial}</div>
        </div>

        <div style={s.heroBody}>
          <div style={s.heroTop}>
            <div>
              <h1 style={s.name}>{displayName}</h1>
              {profile.companyName && (
                <div style={s.username}>@{profile.username}</div>
              )}
            </div>
            {!editing && (
              <button style={s.editBtn} onClick={startEdit}>Edit profile</button>
            )}
          </div>

          <div style={s.metaRow}>
            {profile.location && (
              <span style={s.metaItem}>
                {profile.location}
              </span>
            )}
            <span style={s.metaItem}>
              Member since {joinYear(profile.createdDate)}
            </span>
            <span style={s.metaItem}>
              {profile.email}
            </span>
          </div>

          {(profile.website || profile.linkedIn) && (
            <div style={s.linksRow}>
              {profile.website && (
                <a href={safeHref(profile.website)} target="_blank" rel="noreferrer" style={s.extLink}>
                  {profile.website}
                </a>
              )}
              {profile.linkedIn && (
                <a href={safeHref(profile.linkedIn)} target="_blank" rel="noreferrer" style={s.extLink}>
                  LinkedIn
                </a>
              )}
            </div>
          )}

          {profile.bio && !editing && (
            <p style={s.bio}>{profile.bio}</p>
          )}
        </div>
      </div>

      {/* ── Edit form ── */}
      {editing && (
        <form style={s.editCard} onSubmit={handleSave}>
          <div style={s.editGrid}>
            <div style={s.field}>
              <label style={s.label}>Company / Studio name</label>
              <input style={s.input} value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} placeholder="e.g. Studio Andersen" />
            </div>
            <div style={s.field}>
              <label style={s.label}>Location</label>
              <input style={s.input} value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Copenhagen, Denmark" />
            </div>
            <div style={s.field}>
              <label style={s.label}>Website</label>
              <input style={s.input} value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="yoursite.com" />
            </div>
            <div style={s.field}>
              <label style={s.label}>LinkedIn</label>
              <input style={s.input} value={form.linkedIn} onChange={e => setForm(f => ({ ...f, linkedIn: e.target.value }))} placeholder="linkedin.com/in/you" />
            </div>
          </div>
          <div style={s.field}>
            <label style={s.label}>Bio</label>
            <textarea
              style={{ ...s.input, ...s.textarea }}
              value={form.bio}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              placeholder="Tell manufacturers a bit about your practice…"
              rows={3}
            />
          </div>
          {saveError && <p style={s.err}>{saveError}</p>}
          <div style={s.editBtns}>
            <button type="submit" style={s.saveBtn} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
            <button type="button" style={s.cancelBtn} onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      )}

      {/* ── Stats row ── */}
      <div style={s.statsRow}>
        <Link to="/projects" style={s.statCard}>
          <div style={s.statValue}>{profile.projectCount}</div>
          <div style={s.statLabel}>Project{profile.projectCount !== 1 ? 's' : ''}</div>
        </Link>
        <Link to="/elements" style={s.statCard}>
          <div style={s.statValue}>{profile.elementCount}</div>
          <div style={s.statLabel}>Element{profile.elementCount !== 1 ? 's' : ''}</div>
        </Link>
        <Link to="/saved" style={s.statCard}>
          <div style={s.statValue}>{profile.savedCount}</div>
          <div style={s.statLabel}>Saved product{profile.savedCount !== 1 ? 's' : ''}</div>
        </Link>
      </div>

    </div>
  );
}

const s = {
  page:      { padding: '28px', maxWidth: '860px', margin: '0 auto' },
  state:     { textAlign: 'center', padding: '80px', color: '#808080' },

  hero:      { border: '1px solid #9a9790', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', background: '#d4d0c8', padding: '22px', display: 'flex', gap: '20px', marginBottom: '18px' },
  avatarWrap:{ flexShrink: 0 },
  avatar:    { width: '64px', height: '64px', background: '#000080', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: 700 },

  heroBody:  { flex: 1, minWidth: 0 },
  heroTop:   { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' },
  name:      { margin: '0 0 2px', fontSize: '1.4rem', fontWeight: 700, color: '#000000' },
  username:  { fontSize: '0.83rem', color: '#808080' },
  editBtn:   { padding: '5px 14px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#d4d0c8', cursor: 'pointer', fontSize: '0.82rem', color: '#000000', flexShrink: 0, fontFamily: 'inherit' },

  metaRow:   { display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '8px' },
  metaItem:  { display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.83rem', color: '#404040' },
  metaIcon:  { fontSize: '0.82rem' },

  linksRow:  { display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' },
  extLink:   { fontSize: '0.82rem', color: '#000080', textDecoration: 'none', borderBottom: '1px solid #000080' },

  bio:       { margin: '8px 0 0', fontSize: '0.88rem', color: '#404040', lineHeight: 1.6 },

  editCard:  { border: '1px solid #9a9790', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', background: '#d4d0c8', padding: '16px 20px', marginBottom: '18px', display: 'flex', flexDirection: 'column', gap: '10px' },
  editGrid:  { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px' },
  field:     { display: 'flex', flexDirection: 'column', gap: '3px' },
  label:     { fontSize: '0.72rem', fontWeight: 700, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.04em' },
  input:     { border: '1px solid #9a9790', background: '#ffffff', color: '#000000', padding: '4px 8px', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' },
  textarea:  { resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 },
  err:       { color: '#c00000', fontSize: '0.82rem', margin: 0 },
  editBtns:  { display: 'flex', gap: '8px' },
  saveBtn:   { padding: '5px 18px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#000080', color: '#ffffff', cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem', fontFamily: 'inherit' },
  cancelBtn: { padding: '5px 16px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#d4d0c8', color: '#000000', cursor: 'pointer', fontSize: '0.88rem', fontFamily: 'inherit' },

  statsRow:  { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' },
  statCard:  { border: '1px solid #9a9790', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', background: '#d4d0c8', padding: '18px 20px', textDecoration: 'none', display: 'block' },
  statValue: { fontSize: '1.8rem', fontWeight: 700, color: '#000000', marginBottom: '4px' },
  statLabel: { fontSize: '0.82rem', color: '#808080' },
};
