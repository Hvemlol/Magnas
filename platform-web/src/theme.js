// Windows 98 Modern Design System

export const C = {
  bg:      '#c0c0c0',  // desktop/page background
  face:    '#d4d0c8',  // window & panel face
  white:   '#ffffff',  // content areas, inputs
  text:    '#000000',  // primary text
  gray:    '#808080',  // secondary text, shadow border
  dark:    '#404040',  // darker shadow
  blue:    '#000080',  // title bar, selected items
  blueMid: '#1084d0',  // title bar gradient end
  link:    '#000080',  // hyperlink blue
};

// Raised bevel (panels, buttons)
export const raise = {
  borderTop:    '2px solid #ffffff',
  borderLeft:   '2px solid #ffffff',
  borderRight:  '2px solid #808080',
  borderBottom: '2px solid #808080',
};

// Sunken bevel (inputs, list boxes)
export const sink = {
  borderTop:    '2px solid #808080',
  borderLeft:   '2px solid #808080',
  borderRight:  '2px solid #ffffff',
  borderBottom: '2px solid #ffffff',
};

// Standard raised button
export const btn = {
  ...raise,
  background:   '#d4d0c8',
  color:        '#000000',
  cursor:       'pointer',
  padding:      '4px 16px',
  fontSize:     '0.88rem',
  fontFamily:   'inherit',
  display:      'inline-flex',
  alignItems:   'center',
  justifyContent: 'center',
  userSelect:   'none',
  borderRadius: 0,
};

// Text input / textarea / select
export const inp = {
  ...sink,
  background:   '#ffffff',
  color:        '#000000',
  padding:      '4px 8px',
  fontSize:     '0.9rem',
  fontFamily:   'inherit',
  width:        '100%',
  boxSizing:    'border-box',
  outline:      'none',
  borderRadius: 0,
};

// Raised panel face
export const panel = {
  ...raise,
  background: '#d4d0c8',
  padding:    '12px',
};

// Window title bar
export const titleBar = {
  background:     'linear-gradient(90deg, #000080 0%, #1084d0 100%)',
  color:          '#ffffff',
  padding:        '3px 8px',
  fontWeight:     700,
  fontSize:       '0.88rem',
  display:        'flex',
  alignItems:     'center',
  justifyContent: 'space-between',
  userSelect:     'none',
  flexShrink:     0,
  letterSpacing:  '0.01em',
};
