export function gwpColour(v) {
  if (v < 0)   return { color: '#2e7d32', bg: '#e8f5e9' };
  if (v < 50)  return { color: '#1565c0', bg: '#e3f2fd' };
  if (v < 150) return { color: '#e65100', bg: '#fff3e0' };
  return               { color: '#c62828', bg: '#ffebee' };
}

export function fireRatingColour(rating) {
  const r = (rating ?? '').toUpperCase();
  if (r.startsWith('A1'))  return { text: '#1b5e20', bg: '#e8f5e9' };
  if (r.startsWith('A2'))  return { text: '#2e7d32', bg: '#f1f8e9' };
  if (r.startsWith('B'))   return { text: '#e65100', bg: '#fff3e0' };
  if (r.startsWith('C'))   return { text: '#bf360c', bg: '#fbe9e7' };
  if (r.startsWith('DFL')) return { text: '#6a1a1a', bg: '#ffebee' };
  return                          { text: '#555',    bg: '#f5f5f5' };
}
