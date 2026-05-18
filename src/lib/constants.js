// Types de zones du dépôt
export const ZONE_TYPES = {
  EMPTY:    { id: 'EMPTY',    label: 'Vide',        color: '#1a1a1a', short: '·'  },
  RECEPT:   { id: 'RECEPT',   label: 'Réception',   color: '#3b82f6', short: 'R'  },
  DISPATCH: { id: 'DISPATCH', label: 'Départ',      color: '#8b5cf6', short: 'D'  },
  PREP:     { id: 'PREP',     label: 'Préparation', color: '#f59e0b', short: 'P'  },
  PICK:     { id: 'PICK',     label: 'Picking',     color: '#10b981', short: 'K'  },
  PALLET:   { id: 'PALLET',   label: 'Palettes',    color: '#64748b', short: 'L'  },
  AISLE:    { id: 'AISLE',    label: 'Allée',       color: '#27272a', short: '—'  },
  WALL:     { id: 'WALL',     label: 'Mur',         color: '#0a0a0a', short: '█'  },
};

export const DEFAULT_GRID_W = 20;
export const DEFAULT_GRID_H = 12;

// Seuils de classification ABC (picks par semaine)
export const ABC_THRESHOLDS = {
  A: 50,  // Très forte rotation
  B: 20,  // Forte rotation
  C: 5,   // Rotation moyenne
  // D = < 5
};
