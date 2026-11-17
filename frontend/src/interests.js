// Examples for the landing and sign-in pages. Real interests are created by the people using Helios.
export const INTERESTS = [
  { name: 'Electronics', color: '#2fd39a' },
  { name: 'Photography', color: '#ffd60a' },
  { name: 'Chess', color: '#ff8a7d' },
  { name: 'Open source', color: '#9db0ff' },
  { name: 'Music production', color: '#ffb3e6' },
];

const SHAPES = [
  'polygon(50% 0, 100% 100%, 0 100%)',
  'circle(50%)',
  'inset(0)',
  'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)',
  'polygon(0 0, 100% 0, 50% 100%)',
  'polygon(50% 0, 100% 38%, 82% 100%, 18% 100%, 0 38%)',
];

// A tag keeps the same shape everywhere because the shape comes from its name.
const shapeOf = (name) =>
  SHAPES[[...name.toLowerCase()].reduce((sum, char) => sum + char.charCodeAt(0), 0) % SHAPES.length];

export const tagStyle = (tag) => ({ '--c': tag.color, '--p': shapeOf(tag.name) });
