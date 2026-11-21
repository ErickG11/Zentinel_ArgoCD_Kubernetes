import { useEffect, useState } from 'react';

/** Devuelve el valor tras `delay` ms sin cambios (para búsquedas con debounce). */
export function useDebounced<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}
