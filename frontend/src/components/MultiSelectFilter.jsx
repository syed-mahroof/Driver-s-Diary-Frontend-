import { useId, useRef, useEffect, useState } from 'react';

export default function MultiSelectFilter({ label, options, value, onChange, onAdd }) {
  const id = useId();
  const root = useRef(null);
  const trigger = useRef(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selected = new Set(value.map(String));
  useEffect(() => {
    if (!open) return;
    const close = event => { if (!root.current?.contains(event.target)) setOpen(false); };
    const escape = event => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape); };
  }, [open]);
  const toggle = key => onChange(selected.has(String(key)) ? value.filter(v => String(v) !== String(key)) : [...value, String(key)]);
  return <div className="form-group multi-filter" ref={root} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <span className="filter-label" id={`${id}-label`}>{label}</span>
    <button ref={trigger} type="button" className="multi-filter-trigger" aria-labelledby={`${id}-label ${id}-value`}
      aria-expanded={open} aria-controls={id} onClick={() => { setOpen(!open); setSearch(''); }}>
      <span id={`${id}-value`}>{selected.size ? `${selected.size} selected` : `All ${label.toLowerCase()}`}</span><span aria-hidden="true">⌄</span>
    </button>
    {open && <div className="multi-filter-popover" id={id} role="group" aria-label={`Select ${label.toLowerCase()}`}>
      <input className="multi-filter-search" aria-label={`Search ${label.toLowerCase()}`} placeholder="Search…" value={search} onChange={event => setSearch(event.target.value)} />
      <label className="multi-filter-option"><input type="checkbox" checked={!selected.size} onChange={() => onChange([])} /><span>All {label.toLowerCase()}</span></label>
      <div className="multi-filter-options">
        {options.filter(option => option.label.toLowerCase().includes(search.toLowerCase())).map(option =>
          <label className="multi-filter-option" key={option.value}>
            <input type="checkbox" checked={selected.has(String(option.value))} onChange={() => toggle(option.value)} /><span>{option.label}</span>
          </label>)}
        {!options.some(option => option.label.toLowerCase().includes(search.toLowerCase())) && <p className="filter-hint">No matches.</p>}
      </div>
      <div className="multi-filter-footer">
        {onAdd && <button type="button" className="text-action" onClick={() => { setOpen(false); onAdd(); }}>+ Add new</button>}
        <button type="button" className="text-action" onClick={() => { setOpen(false); trigger.current?.focus(); }}>Done</button>
      </div>
    </div>}
  </div>;
}
