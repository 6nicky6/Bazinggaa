// Bazingga brand palette — see CLAUDE.md design rules.
// Red is for PRIMARY ACTIONS ONLY. Yellow is accent. Dark-mode first.
export const colors = {
  red: '#E10600',
  redHot: '#FF3B1F', // gradient partner for the primary red
  yellow: '#F6B800',
  yellowSoft: '#FFD34D',
  black: '#0B0B0B',
  white: '#FFFFFF',
  // dark surfaces
  surface: '#161616',
  surfaceRaised: '#1F1F1F',
  glass: 'rgba(255,255,255,0.06)',
  glassBorder: 'rgba(255,255,255,0.10)',
  border: '#2A2A2A',
  // text
  textPrimary: '#FFFFFF',
  textSecondary: '#9A9A9A',
  textTertiary: '#6B6B6B',
  online: '#34D399',
};

// Signature gradients
export const gradients = {
  primary: [colors.red, colors.redHot] as const, // CTA buttons, FAB
  bolt: [colors.yellow, colors.yellowSoft] as const,
  momentRing: [colors.red, colors.yellow] as const, // story rings
  avatar1: ['#7C3AED', '#C084FC'] as const,
  avatar2: ['#0891B2', '#22D3EE'] as const,
  avatar3: ['#16A34A', '#4ADE80'] as const,
  avatar4: ['#DB2777', '#F472B6'] as const,
  avatar5: ['#EA580C', '#FB923C'] as const,
};

// Indexable list for live mode: DB stores avatar_gradient as an index.
export const avatarGradients: readonly (readonly [string, string])[] = [
  gradients.primary,
  gradients.avatar1,
  gradients.avatar2,
  gradients.avatar3,
  gradients.avatar4,
  gradients.avatar5,
];
