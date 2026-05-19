import type { CSSProperties } from 'react';

export const pageStyle: CSSProperties = {
  padding: 24
};

export const pageGridStyle: CSSProperties = {
  ...pageStyle,
  display: 'grid',
  gap: 12
};

export const listStyle: CSSProperties = {
  display: 'grid',
  gap: 8
};

export const errorTextStyle: CSSProperties = {
  color: '#a10f2b'
};

export const mutedTextStyle: CSSProperties = {
  fontSize: 13,
  color: '#4b5563'
};
