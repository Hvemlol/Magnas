import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddToProjectModal from '../components/AddToProjectModal';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import api from '../services/api';

const PROJECTS = [
  { id: 1, name: 'Library renovation', location: 'Copenhagen' },
  { id: 2, name: 'School extension', location: '' },
];

const GROUPS = [
  { id: 10, name: 'Facade' },
  { id: 11, name: 'Roof' },
];

describe('AddToProjectModal — product-first mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: PROJECTS });
  });

  function renderProductFirst(overrides = {}) {
    return render(
      <AddToProjectModal
        productId={5}
        productName="Rockwool 035"
        onClose={vi.fn()}
        {...overrides}
      />
    );
  }

  it('renders the modal title with the product name', async () => {
    renderProductFirst();
    expect(await screen.findByText(/Add "Rockwool 035" to a project/i)).toBeInTheDocument();
  });

  it('loads and displays project options', async () => {
    renderProductFirst();
    expect(await screen.findByRole('option', { name: /Library renovation/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /School extension/ })).toBeInTheDocument();
  });

  it('calls onClose when the Close button is clicked', async () => {
    const onClose = vi.fn();
    renderProductFirst({ onClose });
    await screen.findByText(/Library renovation/);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when the ✕ button is clicked', async () => {
    const onClose = vi.fn();
    renderProductFirst({ onClose });
    await screen.findByText(/Library renovation/);
    fireEvent.click(screen.getByRole('button', { name: '✕' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('Add to project button is disabled until a project is selected', async () => {
    renderProductFirst();
    await screen.findByText(/Library renovation/);
    expect(screen.getByRole('button', { name: /Add to project/i })).toBeDisabled();
  });

  it('Add to project button becomes enabled after selecting a project', async () => {
    api.get
      .mockResolvedValueOnce({ data: PROJECTS })   // /projects
      .mockResolvedValueOnce({ data: { groups: [] } }); // /projects/1
    renderProductFirst();
    const select = await screen.findByRole('combobox');
    fireEvent.change(select, { target: { value: '1' } });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Add to project/i })).not.toBeDisabled()
    );
  });

  it('submits the product to the selected project and shows success', async () => {
    const onAdded = vi.fn();
    api.get
      .mockResolvedValueOnce({ data: PROJECTS })
      .mockResolvedValueOnce({ data: { groups: [] } });
    api.post.mockResolvedValueOnce({});
    renderProductFirst({ onAdded });
    const select = await screen.findByRole('combobox');
    fireEvent.change(select, { target: { value: '1' } });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Add to project/i })).not.toBeDisabled()
    );
    fireEvent.click(screen.getByRole('button', { name: /Add to project/i }));
    expect(await screen.findByText(/"Rockwool 035" added successfully/i)).toBeInTheDocument();
    expect(onAdded).toHaveBeenCalledOnce();
  });

  it('shows subgroup selector after project with groups is selected', async () => {
    api.get
      .mockResolvedValueOnce({ data: PROJECTS })
      .mockResolvedValueOnce({ data: { groups: GROUPS } });
    renderProductFirst();
    const select = await screen.findByRole('combobox');
    fireEvent.change(select, { target: { value: '1' } });
    expect(await screen.findByRole('option', { name: 'Facade' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Roof' })).toBeInTheDocument();
  });

  it('shows an error message on failed submission', async () => {
    api.get
      .mockResolvedValueOnce({ data: PROJECTS })
      .mockResolvedValueOnce({ data: { groups: [] } });
    api.post.mockRejectedValueOnce({ response: { data: { error: 'Already in project' } } });
    renderProductFirst();
    const select = await screen.findByRole('combobox');
    fireEvent.change(select, { target: { value: '1' } });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Add to project/i })).not.toBeDisabled()
    );
    fireEvent.click(screen.getByRole('button', { name: /Add to project/i }));
    expect(await screen.findByText('Already in project')).toBeInTheDocument();
  });
});

describe('AddToProjectModal — project-first mode', () => {
  beforeEach(() => vi.clearAllMocks());

  function renderProjectFirst(overrides = {}) {
    return render(
      <AddToProjectModal
        projectId={1}
        projectGroups={GROUPS}
        onClose={vi.fn()}
        {...overrides}
      />
    );
  }

  it('renders the generic modal title', () => {
    renderProjectFirst();
    expect(screen.getByText('Add product to project')).toBeInTheDocument();
  });

  it('renders the product search input', () => {
    renderProjectFirst();
    expect(screen.getByPlaceholderText(/Type to search products/i)).toBeInTheDocument();
  });

  it('shows search results returned by the API', async () => {
    const results = [
      { id: 7, name: 'Isover KL 34', category: 'Insulation', manufacturerName: 'Saint-Gobain' },
    ];
    api.get.mockResolvedValueOnce({ data: results });
    renderProjectFirst();
    fireEvent.change(screen.getByPlaceholderText(/Type to search products/i), {
      target: { value: 'Isover' },
    });
    expect(await screen.findByText('Isover KL 34')).toBeInTheDocument();
  });

  it('shows "No products found" when search returns empty', async () => {
    api.get.mockResolvedValueOnce({ data: [] });
    renderProjectFirst();
    fireEvent.change(screen.getByPlaceholderText(/Type to search products/i), {
      target: { value: 'xyz' },
    });
    expect(await screen.findByText('No products found.')).toBeInTheDocument();
  });
});
