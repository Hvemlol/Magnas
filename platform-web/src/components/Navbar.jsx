import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleLogout() {
    setOpen(false);
    logout();
    navigate('/');
  }

  return (
    <nav style={s.nav}>
      <Link to="/" style={s.logo}>Platform</Link>
      <div style={s.links}>
        <Link to="/" style={s.link}>Discover</Link>
        <Link to="/" style={s.link}>Products</Link>
        {user?.role === 'Architect' && <Link to="/projects" style={s.link}>Projects</Link>}
        {user?.role === 'Architect' && <Link to="/elements" style={s.link}>Elements</Link>}
        <div style={s.navDivider} />
        {!user && (
          <>
            <Link to="/login" style={s.link}>Login</Link>
            <Link to="/register" style={s.link}>Register</Link>
          </>
        )}
        {user && (
          <div ref={dropdownRef} style={s.dropdownWrap}>
            <button style={s.userBtn} onClick={() => setOpen(o => !o)}>
              <span style={s.avatar}>{user.username.charAt(0).toUpperCase()}</span>
              <span style={s.username}>{user.username}</span>
              <span style={s.caret}>{open ? '▴' : '▾'}</span>
            </button>

            {open && (
              <div style={s.dropdown}>
                <div style={s.dropdownHeader}>
                  <div style={s.dropdownName}>{user.username}</div>
                  <div style={s.dropdownRole}>{user.role}</div>
                </div>
                <div style={s.divider} />
                {user.role === 'Manufacturer' && (
                  <Link to={`/manufacturer/${user.id}`} style={s.dropdownItem} onClick={() => setOpen(false)}>
                    View public profile
                  </Link>
                )}
                {user.role === 'Manufacturer' && (
                  <Link to="/dashboard" style={s.dropdownItem} onClick={() => setOpen(false)}>
                    Dashboard
                  </Link>
                )}
                {user.role === 'Architect' && (
                  <Link to="/profile" style={s.dropdownItem} onClick={() => setOpen(false)}>
                    My profile
                  </Link>
                )}
                {user.role === 'Architect' && (
                  <Link to="/projects" style={s.dropdownItem} onClick={() => setOpen(false)}>
                    My projects
                  </Link>
                )}
                {user.role === 'Architect' && (
                  <Link to="/elements" style={s.dropdownItem} onClick={() => setOpen(false)}>
                    My elements
                  </Link>
                )}
                {user.role === 'Architect' && (
                  <Link to="/saved" style={s.dropdownItem} onClick={() => setOpen(false)}>
                    Saved products
                  </Link>
                )}
                <div style={s.divider} />
                <button onClick={handleLogout} style={s.dropdownItemBtn}>Log out</button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

const s = {
  nav:             { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', height: '44px', background: '#d4d0c8', borderBottom: '1px solid #9a9790', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', position: 'relative', zIndex: 100 },
  logo:            { color: '#000080', textDecoration: 'none', fontWeight: 700, fontSize: '1.05rem', padding: '3px 10px', letterSpacing: '0.01em' },
  links:           { display: 'flex', alignItems: 'center', gap: '2px' },
  link:            { color: '#000000', textDecoration: 'none', fontSize: '0.88rem', padding: '4px 10px', display: 'block' },
  navDivider:      { width: '1px', height: '20px', background: '#9a9790', flexShrink: 0, margin: '0 6px' },

  dropdownWrap:    { position: 'relative' },
  userBtn:         { display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #9a9790', background: '#d4d0c8', padding: '4px 10px', cursor: 'pointer', color: '#000000', fontSize: '0.85rem', fontFamily: 'inherit' },
  avatar:          { width: '20px', height: '20px', background: '#000080', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 700, color: '#ffffff', flexShrink: 0 },
  username:        { fontSize: '0.85rem', color: '#000000' },
  caret:           { fontSize: '0.6rem', color: '#000000' },

  dropdown:        { position: 'absolute', right: 0, top: 'calc(100% + 4px)', background: '#d4d0c8', border: '1px solid #9a9790', boxShadow: '0 3px 8px rgba(0,0,0,0.14)', minWidth: '200px', zIndex: 201 },
  dropdownHeader:  { padding: '10px 12px 8px' },
  dropdownName:    { fontWeight: 700, fontSize: '0.88rem', color: '#000000' },
  dropdownRole:    { fontSize: '0.75rem', color: '#808080', marginTop: '2px' },
  divider:         { borderTop: '1px solid #9a9790', margin: '3px 0', height: 0 },
  dropdownItem:    { display: 'block', padding: '6px 12px', fontSize: '0.85rem', color: '#000000', textDecoration: 'none' },
  dropdownItemBtn: { display: 'block', width: '100%', textAlign: 'left', padding: '6px 12px', fontSize: '0.85rem', color: '#c62828', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' },
};
