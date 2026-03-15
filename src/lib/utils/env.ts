/** Returns true when VITE_DEBUG_MODE === 'true' */
export const isDebugMode = (): boolean => import.meta.env.VITE_DEBUG_MODE === 'true';

