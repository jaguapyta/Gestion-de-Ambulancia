// URL base del backend. En desarrollo cae a localhost; en producción se define
// con NEXT_PUBLIC_API_URL en tiempo de BUILD (las NEXT_PUBLIC_* se embeben al compilar).
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// URL para socket.io (por defecto, la misma del API).
export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || API_URL;
