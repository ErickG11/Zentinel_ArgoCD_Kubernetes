import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const KEY = 'zs-compare';
export const MAX_COMPARE = 4;

function load(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_COMPARE) : [];
  } catch {
    return [];
  }
}

interface CompareCtx {
  ids: string[];
  toggle: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
}
const Ctx = createContext<CompareCtx | null>(null);

export function CompareProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>(load);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(ids));
    } catch {
      /* ignorar */
    }
  }, [ids]);
  const toggle = useCallback(
    (id: string) =>
      setIds((cur) =>
        cur.includes(id)
          ? cur.filter((x) => x !== id)
          : cur.length >= MAX_COMPARE
            ? cur
            : [...cur, id],
      ),
    [],
  );
  const value = useMemo<CompareCtx>(
    () => ({
      ids,
      toggle,
      remove: (id) => setIds((c) => c.filter((x) => x !== id)),
      clear: () => setIds([]),
      has: (id) => ids.includes(id),
    }),
    [ids, toggle],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCompare(): CompareCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCompare debe usarse dentro de <CompareProvider>');
  return c;
}
