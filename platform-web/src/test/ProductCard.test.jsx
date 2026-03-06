import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProductCard from '../components/ProductCard';

// Mock the api module
vi.mock('../services/api', () => ({
  default: {
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock useAuth — default to Architect so save buttons show
const mockUseAuth = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

import api from '../services/api';

const baseProduct = {
  id: 1,
  name: 'Rockwool 035',
  category: 'Insulation',
  manufacturerId: 10,
  manufacturerName: 'Rockwool A/S',
  material: 'Stone wool',
  fireRating: 'A1',
  gwpA1A3: 3.5,
};

function renderCard(props = {}) {
  return render(
    <MemoryRouter>
      <ProductCard product={baseProduct} {...props} />
    </MemoryRouter>
  );
}

describe('ProductCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { role: 'Architect' } });
  });

  it('renders product name, category, manufacturer, and material', () => {
    renderCard();
    expect(screen.getByText('Rockwool 035')).toBeInTheDocument();
    expect(screen.getByText('Insulation')).toBeInTheDocument();
    expect(screen.getByText('Rockwool A/S')).toBeInTheDocument();
    expect(screen.getByText('Stone wool')).toBeInTheDocument();
  });

  it('renders the fire rating', () => {
    renderCard();
    expect(screen.getByText('A1')).toBeInTheDocument();
  });

  it('renders the EPD badge when gwpA1A3 is present', () => {
    renderCard();
    expect(screen.getByText('EPD')).toBeInTheDocument();
  });

  it('does not render EPD badge when gwpA1A3 is null', () => {
    renderCard({ product: { ...baseProduct, gwpA1A3: null } });
    expect(screen.queryByText('EPD')).not.toBeInTheDocument();
  });

  it('shows Save button when Architect and product is not saved', () => {
    renderCard({ savedId: null });
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('shows Saved button when product is already saved', () => {
    renderCard({ savedId: 42 });
    expect(screen.getByRole('button', { name: /Saved/i })).toBeInTheDocument();
  });

  it('hides save controls for Manufacturer role', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'Manufacturer' } });
    renderCard({ savedId: null });
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  });

  it('hides save controls when not logged in', () => {
    mockUseAuth.mockReturnValue({ user: null });
    renderCard({ savedId: null });
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  });

  it('calls onSaved callback after successful save', async () => {
    const onSaved = vi.fn();
    api.post.mockResolvedValueOnce({ data: { id: 99 } });
    renderCard({ savedId: null, onSaved });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(1, 99));
  });

  it('calls onUnsaved callback after successful unsave', async () => {
    const onUnsaved = vi.fn();
    api.delete.mockResolvedValueOnce({});
    renderCard({ savedId: 42, onUnsaved });
    fireEvent.click(screen.getByRole('button', { name: /Saved/i }));
    await waitFor(() => expect(onUnsaved).toHaveBeenCalledWith(1));
  });

  it('disables the save button while request is in flight', async () => {
    // Never resolve so the button stays disabled
    api.post.mockReturnValueOnce(new Promise(() => {}));
    renderCard({ savedId: null });
    const btn = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(btn);
    await waitFor(() => expect(btn).toBeDisabled());
  });

  it('links to the correct product detail page', () => {
    renderCard();
    const link = screen.getByRole('link', { name: 'Rockwool 035' });
    expect(link).toHaveAttribute('href', '/product/1');
  });

  it('links to the correct manufacturer profile page', () => {
    renderCard();
    const link = screen.getByRole('link', { name: 'Rockwool A/S' });
    expect(link).toHaveAttribute('href', '/manufacturer/10');
  });
});
