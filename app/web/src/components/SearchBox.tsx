import { useQuery } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { CATEGORY_LABEL } from '../lib/format';
import { useDebounced } from '../lib/hooks';

interface Props {
  size?: 'md' | 'lg';
  initial?: string;
  autoFocus?: boolean;
}

/** Buscador con debounce y sugerencias (patrón combobox accesible). */
export function SearchBox({ size = 'md', initial = '', autoFocus }: Props) {
  const [value, setValue] = useState(initial);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const debounced = useDebounced(value.trim(), 250);
  const nav = useNavigate();
  const listId = useId();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setValue(initial);
  }, [initial]);

  const { data } = useQuery({
    queryKey: ['suggest', debounced],
    queryFn: () => api.suggest(debounced),
    enabled: debounced.length >= 2,
    staleTime: 60_000,
  });
  const suggestions = debounced.length >= 2 ? (data?.suggestions ?? []) : [];

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    setOpen(false);
    nav(value.trim() ? `/catalogo?q=${encodeURIComponent(value.trim())}` : '/catalogo');
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'Enter' && active >= 0 && suggestions[active]) {
      e.preventDefault();
      setOpen(false);
      nav(`/producto/${suggestions[active]!.id}`);
    }
  };

  const expanded = open && suggestions.length > 0;
  return (
    <div className={`search search--${size}`} ref={box}>
      <form role="search" onSubmit={submit}>
        <label htmlFor={`${listId}-input`} className="sr-only">
          Buscar productos
        </label>
        <svg viewBox="0 0 24 24" className="search__icon" aria-hidden="true">
          <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M20 20l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          id={`${listId}-input`}
          type="search"
          role="combobox"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          placeholder="Busca RAM, RTX 4060, AirPods…"
          value={value}
          autoFocus={autoFocus}
          autoComplete="off"
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
        />
        <button type="submit" className="btn btn--primary btn--sm search__btn">
          Buscar
        </button>
      </form>
      {expanded && (
        <ul className="search__list" id={listId} role="listbox" aria-label="Sugerencias">
          {suggestions.map((s, i) => (
            <li
              key={s.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'is-active' : ''}
              onMouseDown={(e) => {
                e.preventDefault();
                setOpen(false);
                nav(`/producto/${s.id}`);
              }}
            >
              <span>{s.name}</span>
              <small className="mono">{CATEGORY_LABEL[s.category]}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
