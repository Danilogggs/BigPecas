const configuredApiOrigin =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_AUTH_API_URL ||
  'http://localhost:3001';

export const AUTH_API_URL = configuredApiOrigin.replace(/\/+$/, '');

export const API_BASE_URL = (
  import.meta.env.VITE_PECAS_API_URL || `${AUTH_API_URL}/api`
).replace(/\/+$/, '');
