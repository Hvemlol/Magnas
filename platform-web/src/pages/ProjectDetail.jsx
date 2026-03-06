import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import api from '../services/api';
import AddToProjectModal from '../components/AddToProjectModal';
import AddElementToProjectModal from '../components/AddElementToProjectModal';
import { BIM7AA } from '../utils/bim7aa';
import { gwpColour, fireRatingColour } from '../utils/colours';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [notFound, setNotFound]     = useState(false);

  // Editing project header
  const [editingHeader, setEditingHeader] = useState(false);
  const [headerForm, setHeaderForm]       = useState({ name: '', description: '', location: '' });

  // Add group
  const [newGroupName, setNewGroupName] = useState('');
  const [addingGroup, setAddingGroup]   = useState(false);

  // Invite collaborator
  const [inviteInput, setInviteInput] = useState('');
  const [inviteError, setInviteError] = useState('');

  // Action errors (replaces alert())
  const [actionError, setActionError] = useState('');

  // In-flight guard (prevents double-submit)
  const [saving, setSaving] = useState(false);

  // Rename group
  const [renamingGroupId, setRenamingGroupId] = useState(null);
  const [renameValue, setRenameValue]         = useState('');

  // Add product modal
  const [showModal, setShowModal] = useState(false);

  // Add element modal
  const [showElementModal, setShowElementModal] = useState(false);

  // Collapsed groups
  const [collapsed, setCollapsed] = useState({});

  useEffect(() => { load(); }, [id]);

  async function load() {
    try {
      const res = await api.get(`/projects/${id}`);
      setProject({ ...res.data, projectElements: res.data.elements ?? [] });
    } catch (err) {
      if (err.response?.status === 404) setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  // ── Header edit ─────────────────────────────────────────────
  function startHeaderEdit() {
    setHeaderForm({ name: project.name, description: project.description ?? '', location: project.location ?? '' });
    setEditingHeader(true);
  }
  async function saveHeader() {
    if (!headerForm.name.trim()) { setActionError('Project name is required.'); return; }
    if (saving) return;
    setSaving(true);
    try {
      const res = await api.put(`/projects/${id}`, headerForm);
      setProject(p => ({ ...p, name: res.data.name, description: res.data.description, location: res.data.location }));
      setEditingHeader(false);
    } catch { setActionError('Failed to save.'); }
    finally { setSaving(false); }
  }

  // ── Groups ──────────────────────────────────────────────────
  async function addGroup(e) {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    if (saving) return;
    setSaving(true);
    try {
      const res = await api.post(`/projects/${id}/groups`, { name: newGroupName.trim() });
      setProject(p => ({ ...p, groups: [...p.groups, res.data] }));
      setNewGroupName('');
      setAddingGroup(false);
    } catch { setActionError('Failed to add group.'); }
    finally { setSaving(false); }
  }

  async function renameGroup(groupId) {
    if (!renameValue.trim()) { setActionError('Group name is required.'); return; }
    if (saving) return;
    setSaving(true);
    try {
      const res = await api.put(`/projects/${id}/groups/${groupId}`, { name: renameValue.trim() });
      setProject(p => ({ ...p, groups: p.groups.map(g => g.id === groupId ? { ...g, name: res.data.name } : g) }));
      setRenamingGroupId(null);
    } catch { setActionError('Failed to rename group.'); }
    finally { setSaving(false); }
  }

  async function deleteGroup(groupId) {
    if (!confirm('Delete this group? Products in it will become ungrouped.')) return;
    try {
      await api.delete(`/projects/${id}/groups/${groupId}`);
      setProject(p => ({
        ...p,
        groups: p.groups.filter(g => g.id !== groupId),
        products: p.products.map(pp => pp.groupId === groupId ? { ...pp, groupId: null, groupName: null } : pp)
      }));
    } catch { setActionError('Failed to delete group.'); }
  }

  // ── Products ────────────────────────────────────────────────
  function handleProductAdded() {
    load(); // Refresh to get the new product
  }

  async function moveProduct(ppId, newGroupId) {
    const pp = project.products.find(p => p.id === ppId);
    if (!pp) return;
    try {
      await api.patch(`/projects/${id}/products/${ppId}`, { groupId: newGroupId ?? null, notes: pp.notes });
      const group = newGroupId ? project.groups.find(g => g.id === newGroupId) : null;
      setProject(p => ({
        ...p,
        products: p.products.map(item => item.id === ppId
          ? { ...item, groupId: newGroupId ?? null, groupName: group?.name ?? null }
          : item)
      }));
    } catch { setActionError('Failed to move product.'); }
  }

  async function updateNotes(ppId, notes) {
    const pp = project.products.find(p => p.id === ppId);
    if (!pp) return;
    try {
      await api.patch(`/projects/${id}/products/${ppId}`, { groupId: pp.groupId ?? null, notes });
      setProject(p => ({ ...p, products: p.products.map(item => item.id === ppId ? { ...item, notes } : item) }));
    } catch { setActionError('Failed to update notes.'); }
  }

  async function removeProduct(ppId) {
    if (!confirm('Remove this product from the project?')) return;
    try {
      await api.delete(`/projects/${id}/products/${ppId}`);
      setProject(p => ({ ...p, products: p.products.filter(item => item.id !== ppId) }));
    } catch { setActionError('Failed to remove product.'); }
  }

  async function removeElement(peId) {
    if (!confirm('Remove this element from the project?')) return;
    try {
      await api.delete(`/projects/${id}/elements/${peId}`);
      setProject(p => ({ ...p, projectElements: p.projectElements.filter(pe => pe.id !== peId) }));
    } catch { setActionError('Failed to remove element.'); }
  }

  // ── Members ──────────────────────────────────────────────────
  async function handleInvite(e) {
    e.preventDefault();
    if (!inviteInput.trim()) return;
    setInviteError('');
    try {
      await api.post(`/projects/${id}/members`, { username: inviteInput.trim() });
      setInviteInput('');
      const res = await api.get(`/projects/${id}/members`);
      setProject(p => ({ ...p, members: res.data }));
    } catch (err) {
      setInviteError(err.response?.data?.error ?? 'Failed to send invite.');
    }
  }

  async function handleRemoveMember(memberId) {
    if (!confirm('Remove this collaborator from the project?')) return;
    try {
      await api.delete(`/projects/${id}/members/${memberId}`);
      setProject(p => ({ ...p, members: p.members.filter(m => m.id !== memberId) }));
    } catch { setActionError('Failed to remove member.'); }
  }

  // ── Derived ─────────────────────────────────────────────────
  const groupedProducts = useMemo(() => {
    if (!project) return { ungrouped: [], byGroup: {} };
    const ungrouped = project.products.filter(pp => !pp.groupId);
    const byGroup = {};
    project.groups.forEach(g => {
      byGroup[g.id] = project.products.filter(pp => pp.groupId === g.id);
    });
    return { ungrouped, byGroup };
  }, [project]);

  const summary = useMemo(() => {
    if (!project) return null;
    const total = project.products.length;
    const withGwp = project.products.filter(pp => pp.product.gwpA1A3 != null);
    const gwpSum = withGwp.reduce((sum, pp) => sum + Number(pp.product.gwpA1A3), 0);
    const fullEpd = project.products.filter(pp =>
      pp.product.gwpA1A3 != null && pp.product.gwpC3 != null && pp.product.gwpC4 != null
    ).length;
    return { total, gwpSum: withGwp.length > 0 ? gwpSum : null, withGwp: withGwp.length, fullEpd };
  }, [project]);

  if (loading)  return <div style={s.state}>Loading...</div>;
  if (notFound) return (
    <div style={s.state}>
      <p>Project not found.</p>
      <Link to="/projects" style={s.backLink}>← Back to Projects</Link>
    </div>
  );

  return (
    <div style={s.page}>
      <Link to="/projects" style={s.back}>← Projects</Link>

      {/* ── Header ── */}
      {editingHeader ? (
        <div style={s.headerEditBox}>
          <input style={s.headerInput} value={headerForm.name} onChange={e => setHeaderForm(f => ({ ...f, name: e.target.value }))} placeholder="Project name" autoFocus />
          <div style={s.grid2}>
            <input style={s.input} value={headerForm.location} onChange={e => setHeaderForm(f => ({ ...f, location: e.target.value }))} placeholder="Location" />
            <input style={s.input} value={headerForm.description} onChange={e => setHeaderForm(f => ({ ...f, description: e.target.value }))} placeholder="Description" />
          </div>
          <div style={s.headerEditBtns}>
            <button style={s.saveBtn} onClick={saveHeader} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            <button style={s.cancelBtn} onClick={() => setEditingHeader(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={s.header}>
          <div>
            <h1 style={s.title}>{project.name}</h1>
            {(project.location || project.description) && (
              <div style={s.headerMeta}>
                {project.location && <span>{project.location}</span>}
                {project.location && project.description && <span style={s.dot}>·</span>}
                {project.description && <span>{project.description}</span>}
              </div>
            )}
          </div>
          <div style={s.headerActions}>
            {project.isOwner && (
              <button style={s.iconBtn} onClick={startHeaderEdit} title="Edit project">Edit</button>
            )}
            <button style={s.addProductsBtn} onClick={() => setShowModal(true)}>+ Add products</button>
          </div>
        </div>
      )}

      {actionError && (
        <div style={s.actionError}>
          {actionError}
          <button style={s.actionErrorDismiss} onClick={() => setActionError('')}>✕</button>
        </div>
      )}

      {/* ── Add group bar ── */}
      <div style={s.groupBar}>
        {addingGroup ? (
          <form style={s.addGroupForm} onSubmit={addGroup}>
            <input
              style={s.groupInput}
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              placeholder="Group name (e.g. Facade, Structure)"
              autoFocus
            />
            <button type="submit" style={s.saveBtn} disabled={saving}>{saving ? 'Adding…' : 'Add'}</button>
            <button type="button" style={s.cancelBtn} onClick={() => { setAddingGroup(false); setNewGroupName(''); }}>Cancel</button>
          </form>
        ) : (
          <button style={s.addGroupBtn} onClick={() => setAddingGroup(true)}>+ Add subgroup</button>
        )}
      </div>

      {/* ── Product sections ── */}
      {project.products.length === 0 ? (
        <div style={s.empty}>
          <p style={s.emptyText}>No products in this project yet.</p>
          <button style={s.addProductsBtn} onClick={() => setShowModal(true)}>+ Add products</button>
        </div>
      ) : (
        <>
          {/* Ungrouped */}
          <ProductSection
            title="Ungrouped"
            items={groupedProducts.ungrouped}
            groups={project.groups}
            collapsed={collapsed['ungrouped']}
            onToggle={() => setCollapsed(c => ({ ...c, ungrouped: !c['ungrouped'] }))}
            onMove={moveProduct}
            onUpdateNotes={updateNotes}
            onRemove={removeProduct}
            gwpColour={gwpColour}
            fireRatingColour={fireRatingColour}
            isUngrouped
          />

          {/* Named groups */}
          {project.groups.map(g => (
            <ProductSection
              key={g.id}
              title={g.name}
              items={groupedProducts.byGroup[g.id] ?? []}
              groups={project.groups}
              collapsed={collapsed[g.id]}
              onToggle={() => setCollapsed(c => ({ ...c, [g.id]: !c[g.id] }))}
              onMove={moveProduct}
              onUpdateNotes={updateNotes}
              onRemove={removeProduct}
              gwpColour={gwpColour}
              fireRatingColour={fireRatingColour}
              isRenaming={renamingGroupId === g.id}
              renameValue={renameValue}
              onStartRename={() => { setRenamingGroupId(g.id); setRenameValue(g.name); }}
              onRenameChange={setRenameValue}
              onRenameSubmit={() => renameGroup(g.id)}
              onRenameCancel={() => setRenamingGroupId(null)}
              onDeleteGroup={() => deleteGroup(g.id)}
              saving={saving}
            />
          ))}

          {/* Elements section */}
          <div style={s.elementsSection}>
            <div style={s.elementsSectionHeader}>
              <span style={s.elementsSectionTitle}>Elements</span>
              <span style={s.elementsSectionCount}>{project.projectElements?.length ?? 0}</span>
              <button style={s.addElementBtn} onClick={() => setShowElementModal(true)}>+ Add element</button>
            </div>
            {(project.projectElements?.length ?? 0) === 0 ? (
              <p style={s.elementsEmpty}>No elements in this project yet.</p>
            ) : (
              <div style={s.elementsTableWrap}>
                <table style={ps.table}>
                  <thead>
                    <tr>
                      <th style={ps.th}>Element</th>
                      <th style={ps.th}>BIM7AA</th>
                      <th style={ps.thRight}>Products</th>
                      <th style={ps.thRight}>GWP A1–A3 sum</th>
                      <th style={ps.th}>Group</th>
                      <th style={ps.th} />
                    </tr>
                  </thead>
                  <tbody>
                    {project.projectElements.map((pe, i) => {
                      const gc = pe.element.gwpSum != null ? gwpColour(pe.element.gwpSum) : null;
                      return (
                        <tr key={pe.id} style={i % 2 === 0 ? ps.rowEven : ps.rowOdd}>
                          <td style={ps.tdName}>
                            <Link to={`/elements/${pe.element.id}`} style={ps.productLink}>{pe.element.name}</Link>
                            {pe.element.description && <span style={s.elementDesc}>{pe.element.description}</span>}
                          </td>
                          <td style={ps.td}>
                            <span style={s.bim7Chip}>
                              <span style={s.bim7Num}>{pe.element.bim7aaCategory}</span>
                              {BIM7AA[pe.element.bim7aaCategory]}
                            </span>
                          </td>
                          <td style={ps.tdRight}>{pe.element.productCount}</td>
                          <td style={ps.tdRight}>
                            {gc
                              ? <span style={{ ...ps.gwpChip, color: gc.color, background: gc.bg }}>
                                  {pe.element.gwpSum < 0 ? pe.element.gwpSum.toFixed(1) : `+${pe.element.gwpSum.toFixed(1)}`}
                                </span>
                              : <span style={ps.noData}>—</span>}
                          </td>
                          <td style={ps.td}>
                            {pe.canEdit ? (
                              <select
                                style={ps.groupSelect}
                                value={pe.groupId ?? ''}
                                onChange={async e => {
                                  const newGroupId = e.target.value ? parseInt(e.target.value) : null;
                                  try {
                                    await api.patch(`/projects/${id}/elements/${pe.id}`, { groupId: newGroupId, notes: pe.notes });
                                    const group = newGroupId ? project.groups.find(g => g.id === newGroupId) : null;
                                    setProject(p => ({ ...p, projectElements: p.projectElements.map(item => item.id === pe.id ? { ...item, groupId: newGroupId, groupName: group?.name ?? null } : item) }));
                                  } catch { setActionError('Failed to move element.'); }
                                }}
                              >
                                <option value="">Ungrouped</option>
                                {project.groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                              </select>
                            ) : (
                              <span style={ps.noData}>{pe.groupName ?? '—'}</span>
                            )}
                          </td>
                          <td style={ps.tdAction}>
                            {pe.canEdit && (
                              <button style={ps.removeBtn} onClick={() => removeElement(pe.id)} title="Remove from project">✕</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Summary */}
          {summary && (
            <div style={s.summaryCard}>
              <div style={s.summaryTitle}>Project Summary</div>
              <div style={s.summaryGrid}>
                <div style={s.summaryItem}>
                  <div style={s.summaryValue}>{summary.total}</div>
                  <div style={s.summaryLabel}>Products</div>
                </div>
                {summary.gwpSum !== null && (
                  <div style={s.summaryItem}>
                    <div style={{ ...s.summaryValue, ...gwpColour(summary.gwpSum / summary.withGwp) }}>
                      {summary.gwpSum < 0 ? summary.gwpSum.toFixed(1) : `+${summary.gwpSum.toFixed(1)}`}
                    </div>
                    <div style={s.summaryLabel}>Total GWP A1–A3 (kg CO₂ eq, {summary.withGwp} products)</div>
                  </div>
                )}
                <div style={s.summaryItem}>
                  <div style={s.summaryValue}>{summary.fullEpd}</div>
                  <div style={s.summaryLabel}>Products with full EPD data</div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Members panel ── */}
      <div style={s.membersPanel}>
        <div style={s.membersPanelHeader}>
          <span style={s.membersPanelTitle}>Members</span>
          {project.isOwner && (
            <form style={s.inviteForm} onSubmit={handleInvite}>
              <input
                style={s.inviteInput}
                value={inviteInput}
                onChange={e => setInviteInput(e.target.value)}
                placeholder="Invite by username…"
              />
              <button type="submit" style={s.inviteBtn}>Invite</button>
            </form>
          )}
        </div>
        {inviteError && <div style={s.inviteError}>{inviteError}</div>}
        <div style={s.membersList}>
          {/* Owner row */}
          <div style={s.memberRow}>
            <span style={s.memberStatus}>●</span>
            <span style={s.memberName}>
              {project.ownerUsername}
              {project.isOwner && ' (you)'}
            </span>
            <span style={s.memberRole}>Owner</span>
          </div>
          {/* Collaborator / Pending rows */}
          {(project.members ?? []).map(m => (
            <div key={m.id} style={s.memberRow}>
              <span style={s.memberStatus}>{m.status === 'Pending' ? '⌛' : '●'}</span>
              <span style={s.memberName}>{m.username}</span>
              <span style={s.memberRole}>{m.status === 'Pending' ? 'Pending' : 'Collaborator'}</span>
              {project.isOwner && (
                <button style={s.removeMemberBtn} onClick={() => handleRemoveMember(m.id)}>
                  {m.status === 'Pending' ? 'Cancel' : 'Remove'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <AddToProjectModal
          projectId={parseInt(id)}
          projectGroups={project.groups}
          onClose={() => setShowModal(false)}
          onAdded={handleProductAdded}
        />
      )}

      {showElementModal && (
        <AddElementToProjectModal
          projectId={parseInt(id)}
          projectGroups={project.groups}
          onClose={() => setShowElementModal(false)}
          onAdded={load}
        />
      )}
    </div>
  );
}

// ── ProductSection ─────────────────────────────────────────────────────────
function ProductSection({
  title, items, groups, collapsed, onToggle,
  onMove, onUpdateNotes, onRemove,
  gwpColour, fireRatingColour,
  isUngrouped = false,
  isRenaming, renameValue, onStartRename, onRenameChange, onRenameSubmit, onRenameCancel, onDeleteGroup,
  saving = false,
}) {
  const [editingNotes, setEditingNotes] = useState(null);
  const [notesValue, setNotesValue]     = useState('');

  return (
    <div style={ps.section}>
      <div style={ps.sectionHeader}>
        <div style={ps.left}>
          <button style={ps.toggle} onClick={onToggle}>
            {collapsed ? '▶' : '▼'}
          </button>
          {isRenaming ? (
            <form style={ps.renameForm} onSubmit={e => { e.preventDefault(); onRenameSubmit(); }}>
              <input style={ps.renameInput} value={renameValue} onChange={e => onRenameChange(e.target.value)} autoFocus />
              <button type="submit" style={ps.renameBtn} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              <button type="button" style={ps.renameCancel} onClick={onRenameCancel}>Cancel</button>
            </form>
          ) : (
            <span style={ps.sectionTitle}>{title}</span>
          )}
          <span style={ps.count}>{items.length}</span>
        </div>
        {!isUngrouped && !isRenaming && (
          <div style={ps.groupActions}>
            <button style={ps.groupActionBtn} onClick={onStartRename}>Rename</button>
            <button style={{ ...ps.groupActionBtn, color: '#c62828' }} onClick={onDeleteGroup}>Delete</button>
          </div>
        )}
      </div>

      {!collapsed && (
        items.length === 0 ? (
          <p style={ps.empty}>No products in this group.</p>
        ) : (
          <div style={ps.tableWrap}>
            <table style={ps.table}>
              <thead>
                <tr>
                  <th style={ps.th}>Product</th>
                  <th style={ps.th}>Category</th>
                  <th style={ps.th}>Material</th>
                  <th style={ps.th}>Fire rating</th>
                  <th style={ps.thRight}>GWP A1–A3</th>
                  <th style={ps.th}>Manufacturer</th>
                  <th style={ps.th}>Group</th>
                  <th style={ps.th}>Notes</th>
                  <th style={ps.th} />
                </tr>
              </thead>
              <tbody>
                {items.map((pp, i) => {
                  const fc  = pp.product.fireRating ? fireRatingColour(pp.product.fireRating) : null;
                  const gwp = pp.product.gwpA1A3;
                  const gc  = gwp != null ? gwpColour(gwp) : null;
                  const isEditingNotes = editingNotes === pp.id;

                  return (
                    <tr key={pp.id} style={i % 2 === 0 ? ps.rowEven : ps.rowOdd}>
                      <td style={ps.tdName}>
                        <Link to={`/product/${pp.product.id}`} style={ps.productLink}>{pp.product.name}</Link>
                        {pp.product.gwpA1A3 != null && <span style={ps.epdBadge}>EPD</span>}
                      </td>
                      <td style={ps.td}><span style={ps.catChip}>{pp.product.category}</span></td>
                      <td style={ps.td}>{pp.product.material}</td>
                      <td style={ps.td}>
                        {fc
                          ? <span style={{ ...ps.fireChip, color: fc.text, background: fc.bg }}>{pp.product.fireRating}</span>
                          : <span style={ps.noData}>—</span>}
                      </td>
                      <td style={ps.tdRight}>
                        {gc
                          ? <span style={{ ...ps.gwpChip, color: gc.color, background: gc.bg }}>
                              {gwp < 0 ? gwp : `+${gwp}`}
                            </span>
                          : <span style={ps.noData}>—</span>}
                      </td>
                      <td style={ps.td}>
                        <Link to={`/manufacturer/${pp.product.manufacturerId}`} style={ps.mfrLink}>
                          {pp.product.manufacturerName}
                        </Link>
                      </td>
                      <td style={ps.td}>
                        {pp.canEdit ? (
                          <select
                            style={ps.groupSelect}
                            value={pp.groupId ?? ''}
                            onChange={e => onMove(pp.id, e.target.value ? parseInt(e.target.value) : null)}
                          >
                            <option value="">Ungrouped</option>
                            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                          </select>
                        ) : (
                          <span style={ps.noData}>{pp.groupName ?? '—'}</span>
                        )}
                      </td>
                      <td style={ps.td}>
                        {pp.canEdit ? (
                          isEditingNotes ? (
                            <div style={ps.notesEdit}>
                              <input
                                style={ps.notesInput}
                                value={notesValue}
                                onChange={e => setNotesValue(e.target.value)}
                                autoFocus
                                onKeyDown={e => {
                                  if (e.key === 'Enter') { onUpdateNotes(pp.id, notesValue); setEditingNotes(null); }
                                  if (e.key === 'Escape') setEditingNotes(null);
                                }}
                              />
                              <button style={ps.notesSave} onClick={() => { onUpdateNotes(pp.id, notesValue); setEditingNotes(null); }}>✓</button>
                            </div>
                          ) : (
                            <span
                              style={ps.notesCell}
                              onClick={() => { setEditingNotes(pp.id); setNotesValue(pp.notes ?? ''); }}
                              title="Click to edit notes"
                            >
                              {pp.notes || <span style={ps.noData}>Add note…</span>}
                            </span>
                          )
                        ) : (
                          <span style={{ fontSize: '0.82rem', color: '#404040' }}>{pp.notes || <span style={ps.noData}>—</span>}</span>
                        )}
                      </td>
                      <td style={ps.tdAction}>
                        {pp.canEdit && (
                          <button style={ps.removeBtn} onClick={() => onRemove(pp.id)} title="Remove from project">✕</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

const s = {
  page:          { padding: '24px', maxWidth: '1200px', margin: '0 auto' },
  state:         { textAlign: 'center', padding: '60px', color: '#808080' },
  back:          { display: 'inline-block', fontSize: '0.85rem', color: '#000080', textDecoration: 'none', marginBottom: '18px' },
  backLink:      { color: '#000080', fontSize: '0.9rem' },

  header:        { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '18px' },
  title:         { margin: 0, fontSize: '1.6rem', fontWeight: 700, color: '#000000' },
  headerMeta:    { fontSize: '0.88rem', color: '#808080', marginTop: '6px', display: 'flex', gap: '6px', alignItems: 'center' },
  dot:           { color: '#808080' },
  headerActions: { display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0, paddingTop: '4px' },
  iconBtn:       { padding: '5px 14px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#d4d0c8', cursor: 'pointer', fontSize: '0.82rem', color: '#000000', fontFamily: 'inherit' },
  addProductsBtn:{ padding: '5px 16px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#000080', color: '#ffffff', cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem', fontFamily: 'inherit' },

  headerEditBox: { border: '1px solid #9a9790', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', background: '#d4d0c8', padding: '16px', marginBottom: '18px', display: 'flex', flexDirection: 'column', gap: '10px' },
  headerInput:   { border: '1px solid #9a9790', background: '#ffffff', color: '#000000', padding: '5px 8px', fontSize: '1rem', fontWeight: 700, width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' },
  grid2:         { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  input:         { border: '1px solid #9a9790', background: '#ffffff', color: '#000000', padding: '4px 8px', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' },
  headerEditBtns:{ display: 'flex', gap: '8px' },
  saveBtn:       { padding: '5px 16px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#000080', color: '#ffffff', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' },
  cancelBtn:     { padding: '5px 16px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#d4d0c8', color: '#000000', cursor: 'pointer', fontFamily: 'inherit' },

  actionError:        { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', color: '#c00000', fontSize: '0.85rem', background: '#ffe0e0', border: '1px solid #c62828', padding: '6px 10px', marginBottom: '14px' },
  actionErrorDismiss: { background: 'none', border: 'none', cursor: 'pointer', color: '#c00000', fontSize: '0.85rem', padding: '0 2px', fontFamily: 'inherit', lineHeight: 1 },

  groupBar:      { marginBottom: '18px' },
  addGroupBtn:   { padding: '5px 14px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#d4d0c8', cursor: 'pointer', fontSize: '0.85rem', color: '#000000', fontFamily: 'inherit' },
  addGroupForm:  { display: 'flex', gap: '8px', alignItems: 'center' },
  groupInput:    { border: '1px solid #9a9790', background: '#ffffff', color: '#000000', padding: '4px 8px', fontSize: '0.9rem', width: '280px', fontFamily: 'inherit', outline: 'none' },

  empty:         { textAlign: 'center', padding: '50px 0' },
  emptyText:     { color: '#808080', marginBottom: '16px' },

  elementsSection:       { border: '1px solid #9a9790', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', background: '#d4d0c8', marginBottom: '14px', overflow: 'hidden' },
  elementsSectionHeader: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#c0c0c0', borderBottom: '1px solid #808080' },
  elementsSectionTitle:  { fontWeight: 700, fontSize: '0.88rem', color: '#000000', flex: 1 },
  elementsSectionCount:  { fontSize: '0.72rem', background: '#d4d0c8', color: '#000000', padding: '0 6px', border: '1px solid #808080' },
  addElementBtn:         { padding: '3px 10px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#d4d0c8', cursor: 'pointer', fontSize: '0.8rem', color: '#000000', marginLeft: 'auto', fontFamily: 'inherit' },
  elementsEmpty:         { padding: '12px 16px', color: '#808080', fontSize: '0.85rem', margin: 0 },
  elementsTableWrap:     { overflowX: 'auto' },
  bim7Chip:              { display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#c0c0c0', padding: '1px 7px 1px 3px', fontSize: '0.78rem', color: '#000000', border: '1px solid #808080' },
  bim7Num:               { display: 'inline-flex', width: '18px', height: '18px', background: '#000080', color: '#ffffff', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 700 },
  elementDesc:           { display: 'block', fontSize: '0.75rem', color: '#808080', marginTop: '1px' },
  summaryCard:   { border: '1px solid #9a9790', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', background: '#d4d0c8', padding: '16px 20px', marginTop: '20px', marginBottom: '14px' },
  membersPanel:        { border: '1px solid #9a9790', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', background: '#d4d0c8', marginTop: '14px', overflow: 'hidden' },
  membersPanelHeader:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#c0c0c0', borderBottom: '1px solid #808080', gap: '12px' },
  membersPanelTitle:   { fontWeight: 700, fontSize: '0.88rem', color: '#000000' },
  inviteForm:          { display: 'flex', gap: '6px', alignItems: 'center' },
  inviteInput:         { border: '1px solid #9a9790', background: '#ffffff', color: '#000000', padding: '3px 8px', fontSize: '0.85rem', width: '180px', fontFamily: 'inherit', outline: 'none' },
  inviteBtn:           { padding: '3px 12px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#000080', color: '#ffffff', cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'inherit' },
  inviteError:         { color: '#c00000', fontSize: '0.82rem', background: '#ffe0e0', border: '1px solid #c62828', padding: '5px 14px' },
  membersList:         { padding: '4px 0' },
  memberRow:           { display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderBottom: '1px solid #e0ddd5', fontSize: '0.88rem' },
  memberStatus:        { fontSize: '0.7rem', color: '#000080', width: '16px', flexShrink: 0 },
  memberName:          { fontWeight: 700, color: '#000000', flex: 1 },
  memberRole:          { fontSize: '0.78rem', color: '#808080' },
  removeMemberBtn:     { padding: '2px 8px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#d4d0c8', cursor: 'pointer', fontSize: '0.75rem', color: '#000000', fontFamily: 'inherit', marginLeft: '8px' },
  summaryTitle:  { fontSize: '0.72rem', fontWeight: 700, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px' },
  summaryGrid:   { display: 'flex', gap: '28px', flexWrap: 'wrap' },
  summaryItem:   { display: 'flex', flexDirection: 'column', gap: '4px' },
  summaryValue:  { fontSize: '1.3rem', fontWeight: 700, color: '#000000', padding: '2px 8px', display: 'inline-block' },
  summaryLabel:  { fontSize: '0.78rem', color: '#808080' },
};

ProductSection.propTypes = {
  title: PropTypes.string.isRequired,
  items: PropTypes.array.isRequired,
  groups: PropTypes.array.isRequired,
  collapsed: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  onMove: PropTypes.func.isRequired,
  onUpdateNotes: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  gwpColour: PropTypes.func.isRequired,
  fireRatingColour: PropTypes.func.isRequired,
  isUngrouped: PropTypes.bool,
  isRenaming: PropTypes.bool,
  renameValue: PropTypes.string,
  onStartRename: PropTypes.func,
  onRenameChange: PropTypes.func,
  onRenameSubmit: PropTypes.func,
  onRenameCancel: PropTypes.func,
  onDeleteGroup: PropTypes.func,
  saving: PropTypes.bool,
};

const ps = {
  section:       { border: '1px solid #9a9790', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', background: '#d4d0c8', marginBottom: '14px', overflow: 'hidden' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#c0c0c0', borderBottom: '1px solid #808080' },
  left:          { display: 'flex', alignItems: 'center', gap: '6px' },
  toggle:        { borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#d4d0c8', cursor: 'pointer', color: '#000000', fontSize: '0.7rem', padding: '1px 5px', fontFamily: 'inherit' },
  sectionTitle:  { fontWeight: 700, fontSize: '0.88rem', color: '#000000' },
  count:         { fontSize: '0.72rem', background: '#d4d0c8', color: '#000000', padding: '0 6px', border: '1px solid #808080' },
  groupActions:  { display: 'flex', gap: '6px' },
  groupActionBtn:{ borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#d4d0c8', cursor: 'pointer', fontSize: '0.75rem', color: '#000000', padding: '1px 6px', fontFamily: 'inherit' },
  renameForm:    { display: 'flex', gap: '6px', alignItems: 'center' },
  renameInput:   { border: '1px solid #9a9790', background: '#ffffff', color: '#000000', padding: '3px 6px', fontSize: '0.88rem', width: '200px', fontFamily: 'inherit', outline: 'none' },
  renameBtn:     { padding: '3px 10px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#000080', color: '#ffffff', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'inherit' },
  renameCancel:  { padding: '3px 10px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#d4d0c8', cursor: 'pointer', fontSize: '0.75rem', color: '#000000', fontFamily: 'inherit' },
  empty:         { padding: '14px 16px', color: '#808080', fontSize: '0.85rem', margin: 0 },

  tableWrap:     { overflowX: 'auto' },
  table:         { width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' },
  th:            { padding: '8px 12px', background: '#d4d0c8', borderBottom: '1px solid #9a9790', textAlign: 'left', fontWeight: 700, color: '#000000', fontSize: '0.72rem', whiteSpace: 'nowrap' },
  thRight:       { padding: '8px 12px', background: '#d4d0c8', borderBottom: '1px solid #9a9790', textAlign: 'right', fontWeight: 700, color: '#000000', fontSize: '0.72rem', whiteSpace: 'nowrap' },
  rowEven:       { background: '#ffffff' },
  rowOdd:        { background: '#f0eeea' },
  td:            { padding: '7px 12px', borderBottom: '1px solid #d4d0c8', color: '#000000', verticalAlign: 'middle' },
  tdName:        { padding: '7px 12px', borderBottom: '1px solid #d4d0c8', fontWeight: 700, color: '#000000', verticalAlign: 'middle', maxWidth: '220px' },
  tdRight:       { padding: '7px 12px', borderBottom: '1px solid #d4d0c8', textAlign: 'right', verticalAlign: 'middle' },
  tdAction:      { padding: '5px 12px', borderBottom: '1px solid #d4d0c8', textAlign: 'right', verticalAlign: 'middle' },
  productLink:   { color: '#000080', textDecoration: 'none', display: 'block', fontWeight: 700 },
  epdBadge:      { display: 'inline-block', marginLeft: '5px', fontSize: '0.63rem', background: '#e8f5e9', color: '#2e7d32', padding: '0 5px', fontWeight: 700, verticalAlign: 'middle', border: '1px solid #2e7d32' },
  catChip:       { display: 'inline-block', background: '#c0c0c0', color: '#000000', padding: '1px 6px', fontSize: '0.75rem', fontWeight: 500, border: '1px solid #808080' },
  fireChip:      { display: 'inline-block', padding: '1px 6px', fontSize: '0.75rem', fontWeight: 700 },
  gwpChip:       { display: 'inline-block', padding: '1px 7px', fontSize: '0.78rem', fontWeight: 700, border: '1px solid currentColor' },
  noData:        { color: '#c0c0c0' },
  mfrLink:       { color: '#000080', textDecoration: 'none', fontSize: '0.85rem' },
  groupSelect:   { border: '1px solid #9a9790', background: '#ffffff', color: '#000000', padding: '2px 5px', fontSize: '0.78rem', cursor: 'pointer', maxWidth: '130px', fontFamily: 'inherit', outline: 'none' },
  notesCell:     { cursor: 'pointer', fontSize: '0.82rem', color: '#404040', display: 'block' },
  notesEdit:     { display: 'flex', gap: '4px', alignItems: 'center' },
  notesInput:    { border: '1px solid #9a9790', background: '#ffffff', padding: '2px 5px', fontSize: '0.82rem', width: '120px', fontFamily: 'inherit', outline: 'none' },
  notesSave:     { borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#000080', color: '#ffffff', cursor: 'pointer', padding: '2px 6px', fontSize: '0.75rem', fontFamily: 'inherit' },
  removeBtn:     { borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080', background: '#d4d0c8', cursor: 'pointer', color: '#000000', fontSize: '0.8rem', padding: '1px 5px', fontFamily: 'inherit' },
};
