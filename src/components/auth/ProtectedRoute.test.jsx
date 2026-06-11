import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

let authState = { user: null, status: 'guest' };

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

describe('ProtectedRoute', () => {
  it('redirects guests to /login', () => {
    authState = { user: null, status: 'guest' };

    render(
      <MemoryRouter initialEntries={['/library']}>
        <Routes>
          <Route
            path="/library"
            element={(
              <ProtectedRoute>
                <div>Private Library</div>
              </ProtectedRoute>
            )}
          />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Login page')).toBeInTheDocument();
  });
});
