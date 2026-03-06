import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';

const mockUseAuth = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

function renderRoute({ user = null, role = undefined } = {}) {
  mockUseAuth.mockReturnValue({ user });
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/"      element={<div>Home page</div>} />
        <Route
          path="/protected"
          element={
            <ProtectedRoute role={role}>
              <div>Protected content</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  it('renders children when user is logged in (no role restriction)', () => {
    renderRoute({ user: { role: 'Architect' } });
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });

  it('redirects to /login when there is no user', () => {
    renderRoute({ user: null });
    expect(screen.getByText('Login page')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('renders children when user has the required role', () => {
    renderRoute({ user: { role: 'Manufacturer' }, role: 'Manufacturer' });
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });

  it('redirects to / when user has the wrong role', () => {
    renderRoute({ user: { role: 'Architect' }, role: 'Manufacturer' });
    expect(screen.getByText('Home page')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('renders children when logged in and no role prop is passed', () => {
    renderRoute({ user: { role: 'Manufacturer' }, role: undefined });
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });
});
