export interface BrandColorPreset {
  id: string;
  name: string;
  category: string;
  hex: string;
  description: string;
}

export const BRAND_COLOR_PRESETS: BrandColorPreset[] = [
  {
    id: 'blue-cast',
    name: 'Azul Clássico (CAST)',
    category: 'Engenharia',
    hex: '#2563eb',
    description: 'Padrão corporativo de alta confiabilidade e clareza.'
  },
  {
    id: 'indigo-tech',
    name: 'Índigo Executivo',
    category: 'Tecnologia',
    hex: '#4f46e5',
    description: 'Aparência moderna ideal para sistemas e consultoria.'
  },
  {
    id: 'violet-modern',
    name: 'Violeta / Roxo',
    category: 'Inovação',
    hex: '#7c3aed',
    description: 'Sofisticação e criatividade para marcas inovadoras.'
  },
  {
    id: 'emerald-clima',
    name: 'Verde Esmeralda (Apex)',
    category: 'Climatização & Elétrica',
    hex: '#059669',
    description: 'Associado a sustentabilidade, refrigeração e eficiência.'
  },
  {
    id: 'cyan-marine',
    name: 'Azul Turquesa',
    category: 'Telecom & Redes',
    hex: '#0284c7',
    description: 'Ótimo contraste para infraestrutura e conectividade.'
  },
  {
    id: 'amber-eng',
    name: 'Âmbar Industrial',
    category: 'Construção Civil',
    hex: '#d97706',
    description: 'Energia, maquinário e força operacional em campo.'
  },
  {
    id: 'orange-solar',
    name: 'Laranja Elétrica',
    category: 'Energia Solar',
    hex: '#ea580c',
    description: 'Destaque visual vibrante para prestadores de energia.'
  },
  {
    id: 'crimson-security',
    name: 'Vermelho / Carmim',
    category: 'Segurança & Incêndio',
    hex: '#dc2626',
    description: 'Forte presença para segurança eletrônica e bombeiros.'
  },
  {
    id: 'slate-navy',
    name: 'Grafite Noturno',
    category: 'Minimalista',
    hex: '#0f172a',
    description: 'Visual sóbrio, premium e elegante de alto padrão.'
  },
  {
    id: 'rose-ruby',
    name: 'Rubi Corporativo',
    category: 'Soluções Especializadas',
    hex: '#e11d48',
    description: 'Design refinado e diferenciado no mercado.'
  }
];

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b };
  }
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b };
  }
  return null;
}

export function adjustBrightness(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const factor = 1 + percent / 100;
  const r = Math.min(255, Math.max(0, Math.round(rgb.r * factor)));
  const g = Math.min(255, Math.max(0, Math.round(rgb.g * factor)));
  const b = Math.min(255, Math.max(0, Math.round(rgb.b * factor)));
  const toHex = (c: number) => c.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function getContrastTextColor(hex: string): '#ffffff' | '#0f172a' {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#ffffff';
  // Luminance calculation
  const yiq = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return yiq >= 150 ? '#0f172a' : '#ffffff';
}

export function applyBrandTheme(color: string): void {
  if (!color || typeof window === 'undefined') return;
  const validHex = color.startsWith('#') ? color : `#${color}`;
  const rgb = hexToRgb(validHex);
  if (!rgb) return;

  const root = document.documentElement;
  const hoverColor = adjustBrightness(validHex, -14);
  const activeColor = adjustBrightness(validHex, -22);
  const lightBg = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.09)`;
  const borderColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)`;
  const ringColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`;
  const textColor = getContrastTextColor(validHex);

  root.style.setProperty('--brand-primary', validHex);
  root.style.setProperty('--brand-primary-hover', hoverColor);
  root.style.setProperty('--brand-primary-active', activeColor);
  root.style.setProperty('--brand-primary-light', lightBg);
  root.style.setProperty('--brand-primary-border', borderColor);
  root.style.setProperty('--brand-primary-ring', ringColor);
  root.style.setProperty('--brand-primary-text', textColor);

  try {
    localStorage.setItem('cast_brand_color', validHex);
  } catch (err) {
    // Ignore storage errors in restricted contexts
  }
}

export function getStoredBrandColor(): string {
  if (typeof window === 'undefined') return '#2563eb';
  try {
    return localStorage.getItem('cast_brand_color') || '#2563eb';
  } catch {
    return '#2563eb';
  }
}
