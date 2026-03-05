import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [form, setForm] = useState({ email: '', username: '', password: '', role: 'Architect', companyName: '' });
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post('/auth/register', form);
      login(res.data);
      navigate(res.data.role === 'Manufacturer' ? '/dashboard' : '/');
    } catch (err) {
      setError(err.response?.data?.error ?? 'Registration failed.');
    }
  }

  return (
    <div style={styles.page}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <h2 style={styles.title}>Create Account</h2>
        <div style={styles.formBody}>
          {error && <div style={styles.error}>{error}</div>}
          <label style={styles.label}>Email</label>
          <input style={styles.input} type="email" value={form.email} onChange={set('email')} required />
          <label style={styles.label}>Username</label>
          <input style={styles.input} type="text" value={form.username} onChange={set('username')} required />
          <label style={styles.label}>Password</label>
          <input style={styles.input} type="password" value={form.password} onChange={set('password')} required />
          <label style={styles.label}>I am a...</label>
          <div style={styles.roleRow}>
            {['Architect', 'Manufacturer'].map(r => (
              <label key={r} style={styles.roleOption}>
                <input type="radio" value={r} checked={form.role === r} onChange={set('role')} />
                {' '}{r}
              </label>
            ))}
          </div>
          {form.role === 'Manufacturer' && (
            <>
              <label style={styles.label}>Company Name</label>
              <input style={styles.input} type="text" value={form.companyName} onChange={set('companyName')} />
            </>
          )}
          <button type="submit" style={styles.btn}>Register</button>
          <p style={styles.switch}>Have an account? <Link to="/login">Login</Link></p>
        </div>
      </form>
    </div>
  );
}

const styles = {
  page:       { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 40px)', background: '#c0c0c0' },
  form:       { border: '1px solid #9a9790', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', width: '360px', display: 'flex', flexDirection: 'column', gap: '0', overflow: 'hidden', background: '#d4d0c8' },
  title:      { margin: 0, fontSize: '0.88rem', fontWeight: 700, background: 'linear-gradient(90deg, #000080 0%, #1084d0 100%)', color: '#ffffff', padding: '5px 10px', letterSpacing: '0.01em' },
  formBody:   { padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' },
  label:      { fontSize: '0.85rem', color: '#000000' },
  input:      { border: '1px solid #9a9790', background: '#ffffff', color: '#000000', padding: '6px 8px', fontSize: '0.9rem', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box', outline: 'none' },
  roleRow:    { display: 'flex', gap: '24px' },
  roleOption: { fontSize: '0.88rem', cursor: 'pointer', color: '#000000' },
  btn:        { marginTop: '8px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#000080', color: '#ffffff', padding: '6px', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit', fontSize: '0.88rem', width: '100%' },
  error:      { color: '#c62828', fontSize: '0.82rem', background: '#ffebee', padding: '6px 8px', border: '1px solid #c62828' },
  switch:     { textAlign: 'center', fontSize: '0.82rem', margin: 0 },
};
