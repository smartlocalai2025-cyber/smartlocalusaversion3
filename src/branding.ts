// Centralized branding configuration
// Allows swapping logo and names via environment or by changing this file

export const appName = (import.meta as any)?.env?.VITE_APP_NAME || 'SmartLocal USA';

// Prefer explicit env override, then SmartLocal USA asset, then legacy default
export const logoUrl: string =
  (import.meta as any)?.env?.VITE_LOGO_URL ||
  '/assets/logo.png';

export const logoAlt: string = `${appName} Logo`;
