import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';

vi.mock('../services/api', () => ({
  default: {
    post: vi.fn(),
  },
}));

import api from '../services/api';

// A simple consumer component that exposes auth state via the DOM
function AuthConsumer() {
  const { user, login, logout } = useAuth();
  return (
    <div>
      <div data-testid="user">{user ? JSON.stringify(user) : 'null'}</div>
      <button
        onClick={() => login({ userId: 1, username: 'alice', role: 'Architect' })}
      >
        Login
      </button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

function renderWithAuth() {
  return render(
    <AuthProvider>
      <AuthConsumer />
    </AuthProvider>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('starts with null user when localStorage is empty', () => {
    renderWithAuth();
    expect(screen.getByTestId('user').textContent).toBe('null');
  });

  it('hydrates user from localStorage on mount', () => {
    const stored = { id: 2, username: 'bob', role: 'Manufacturer' };
    localStorage.setItem('user', JSON.stringify(stored));
    renderWithAuth();
    expect(screen.getByTestId('user').textContent).toContain('"username":"bob"');
  });

  it('sets user and writes to localStorage after login', async () => {
    renderWithAuth();
    await act(async () => {
      screen.getByRole('button', { name: 'Login' }).click();
    });
    const user = JSON.parse(screen.getByTestId('user').textContent);
    expect(user).toEqual({ id: 1, username: 'alice', role: 'Architect' });
    expect(JSON.parse(localStorage.getItem('user'))).toEqual(user);
  });

  it('clears user and localStorage after logout', async () => {
    api.post.mockResolvedValueOnce({});
    const stored = { id: 1, username: 'alice', role: 'Architect' };
    localStorage.setItem('user', JSON.stringify(stored));
    renderWithAuth();
    expect(screen.getByTestId('user').textContent).toContain('alice');
    await act(async () => {
      screen.getByRole('button', { name: 'Logout' }).click();
    });
    expect(screen.getByTestId('user').textContent).toBe('null');
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('still clears local state even if the logout API call fails', async () => {
    api.post.mockRejectedValueOnce(new Error('Network error'));
    const stored = { id: 1, username: 'alice', role: 'Architect' };
    localStorage.setItem('user', JSON.stringify(stored));
    renderWithAuth();
    await act(async () => {
      screen.getByRole('button', { name: 'Logout' }).click();
    });
    expect(screen.getByTestId('user').textContent).toBe('null');
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('maps authResponse fields correctly on login', async () => {
    renderWithAuth();
    await act(async () => {
      screen.getByRole('button', { name: 'Login' }).click();
    });
    const user = JSON.parse(screen.getByTestId('user').textContent);
    // login() maps userId → id, username → username, role → role
    expect(user.id).toBe(1);
    expect(user.username).toBe('alice');
    expect(user.role).toBe('Architect');
  });
});
