import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import ProductCard from '../components/ProductCard';
import { useAuth } from '../context/AuthContext';
import { safeHref } from '../utils/safeHref';

export default function ManufacturerProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [saved, setSaved]     = useState({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.get(`/manufacturers/${id}`)
      .then(res => setProfile(res.data))
      .catch(err => { if (err.response?.status === 404) setNotFound(true); })
      .finally(() => setLoading(false));
  }, [id]);

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

  function handleSaved(productId, savedId)  { setSaved(s => ({ ...s, [productId]: savedId })); }
  function handleUnsaved(productId)         { setSaved(s => { const n = { ...s }; delete n[productId]; return n; }); }

  if (loading)  return <div style={s.state}>Loading...</div>;
  if (notFound) return (
    <div style={s.state}>
      <p>Manufacturer not found.</p>
      <Link to="/" style={s.link}>← Back to Browse</Link>
    </div>
  );

  const joinYear   = new Date(profile.memberSince).getFullYear();
  const initial    = (profile.companyName ?? profile.username).charAt(0).toUpperCase();
  const displayName = profile.companyName ?? profile.username;


  return (
    <div style={s.page}>

      {/* ── Hero header ── */}
      <div style={s.hero}>
        <div style={s.avatar}>{initial}</div>

        <div style={s.heroBody}>
          <h1 style={s.companyName}>{displayName}</h1>

          {profile.location && (
            <div style={s.location}>
              {profile.location}
            </div>
          )}

          <div style={s.badges}>
            <span style={s.badge}>Member since {joinYear}</span>
            <span style={s.badge}>{profile.productCount} product{profile.productCount !== 1 ? 's' : ''}</span>
          </div>

          {/* Links row */}
          {(profile.website || profile.linkedIn) && (
            <div style={s.links}>
              {profile.website && (
                <a href={safeHref(profile.website)} target="_blank" rel="noopener noreferrer" style={s.linkBtn}>
                  Website
                </a>
              )}
              {profile.linkedIn && (
                <a href={safeHref(profile.linkedIn)} target="_blank" rel="noopener noreferrer" style={s.linkBtn}>
                  LinkedIn
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={s.body}>

        {/* Left column: about */}
        <div style={s.sidebar}>
          {profile.bio && (
            <div style={s.card}>
              <h2 style={s.cardTitle}>About</h2>
              <p style={s.bio}>{profile.bio}</p>
            </div>
          )}

          <div style={s.card}>
            <h2 style={s.cardTitle}>Details</h2>
            <dl style={s.dl}>
              {profile.location && (
                <>
                  <dt style={s.dt}>Location</dt>
                  <dd style={s.dd}>{profile.location}</dd>
                </>
              )}
              <dt style={s.dt}>Member since</dt>
              <dd style={s.dd}>{joinYear}</dd>
              <dt style={s.dt}>Products listed</dt>
              <dd style={s.dd}>{profile.productCount}</dd>
              {profile.website && (
                <>
                  <dt style={s.dt}>Website</dt>
                  <dd style={s.dd}>
                    <a href={safeHref(profile.website)} target="_blank" rel="noopener noreferrer" style={s.inlineLink}>
                      {profile.website.replace(/^https?:\/\//, '')}
                    </a>
                  </dd>
                </>
              )}
              {profile.linkedIn && (
                <>
                  <dt style={s.dt}>LinkedIn</dt>
                  <dd style={s.dd}>
                    <a href={safeHref(profile.linkedIn)} target="_blank" rel="noopener noreferrer" style={s.inlineLink}>
                      View profile
                    </a>
                  </dd>
                </>
              )}
            </dl>
          </div>
        </div>

        {/* Right column: products */}
        <div style={s.main}>
          <h2 style={s.sectionTitle}>
            Products
            <span style={s.count}>{profile.products.length}</span>
          </h2>
          {profile.products.length === 0 ? (
            <p style={s.empty}>No published products yet.</p>
          ) : (
            <div style={s.grid}>
              {profile.products.map(p => (
                <ProductCard
                  key={p.id}
                  product={{ ...p, manufacturerName: displayName, manufacturerId: profile.id }}
                  savedId={saved[p.id]}
                  onSaved={handleSaved}
                  onUnsaved={handleUnsaved}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

const s = {
  page:         { maxWidth: '1160px', margin: '0 auto', padding: '28px 24px' },
  state:        { textAlign: 'center', padding: '60px 24px', color: '#808080' },
  link:         { color: '#000080', fontSize: '0.9rem' },

  // Hero
  hero:         { display: 'flex', alignItems: 'flex-start', gap: '20px', border: '1px solid #9a9790', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', background: '#d4d0c8', padding: '22px 28px', marginBottom: '22px' },
  avatar:       { width: '64px', height: '64px', background: '#000080', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', fontWeight: 700, flexShrink: 0 },
  heroBody:     { flex: 1 },
  companyName:  { margin: '0 0 6px', fontSize: '1.5rem', fontWeight: 700, color: '#000000' },
  location:     { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.88rem', color: '#404040', marginBottom: '8px' },
  locationIcon: { fontSize: '0.85rem' },
  badges:       { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' },
  badge:        { fontSize: '0.75rem', background: '#c0c0c0', color: '#000000', padding: '1px 8px', fontWeight: 500, border: '1px solid #808080' },
  links:        { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  linkBtn:      { display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 12px', border: '1px solid #9a9790', background: '#d4d0c8', fontSize: '0.83rem', color: '#000000', textDecoration: 'none', fontWeight: 500 },

  // Body layout
  body:         { display: 'grid', gridTemplateColumns: '240px 1fr', gap: '20px', alignItems: 'start' },

  // Sidebar
  sidebar:      { display: 'flex', flexDirection: 'column', gap: '14px' },
  card:         { border: '1px solid #9a9790', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', background: '#d4d0c8', padding: '16px' },
  cardTitle:    { margin: '0 0 10px', fontSize: '0.9rem', fontWeight: 700, color: '#000000' },
  bio:          { margin: 0, fontSize: '0.88rem', color: '#404040', lineHeight: 1.6 },
  dl:           { margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '5px 10px', alignItems: 'baseline' },
  dt:           { fontSize: '0.72rem', color: '#808080', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' },
  dd:           { margin: 0, fontSize: '0.85rem', color: '#000000' },
  inlineLink:   { color: '#000080', textDecoration: 'underline', fontSize: '0.85rem' },

  // Main products
  main:         { },
  sectionTitle: { fontSize: '0.95rem', fontWeight: 700, color: '#000000', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' },
  count:        { background: '#c0c0c0', color: '#000000', fontSize: '0.72rem', padding: '0 7px', fontWeight: 500, border: '1px solid #808080' },
  empty:        { color: '#808080', fontSize: '0.9rem' },
  grid:         { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' },
};
