import { useState, useEffect, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { adminAPI } from '../utils/api';

const today = () => new Date().toLocaleDateString('en-CA');
const errorMessage = error => {
  const data = error.response?.data;
  return data && typeof data === 'object' ? Object.entries(data).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(' ') : value}`).join(' · ') : error.message || 'Unable to save. Try again.';
};

export function AdminModal({ title, children, onClose, busy = false }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return createPortal(<dialog ref={ref} className="admin-dialog" aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); if (!busy) closeRef.current(); }}
    onClick={event => { if (event.target === event.currentTarget && !busy) closeRef.current(); }}>
    <div className="admin-dialog-inner">
      <div className="modal-header"><h3 id={titleId}>{title}</h3><button className="modal-close" aria-label="Close dialog" disabled={busy} onClick={onClose}>×</button></div>
      {children}
    </div>
  </dialog>, document.body);
}

function Field({ label, children }) {
  return <label className="form-group admin-field"><span>{label}</span>{children}</label>;
}
function SaveActions({ busy, onClose, label = 'Save changes' }) {
  return <div className="modal-actions"><button type="button" className="btn-cancel" disabled={busy} onClick={onClose}>Cancel</button><button className="btn-submit" type="submit" disabled={busy}>{busy ? 'Saving…' : label}</button></div>;
}

export function RideModal({ ride, initialDriver, drivers, companies, vehicles, onClose, onSuccess }) {
  const [form, setForm] = useState(() => ({ driver: ride?.driver || initialDriver || '', company: ride?.company || '', date: ride?.date || today(), ride_time: ride?.ride_time?.slice(0, 5) || '', trip_type: ride?.trip_type || 'P', route: ride?.route || '', pickup: ride?.pickup || '', drop: ride?.drop || '', notes: ride?.notes || '', total_km: ride?.total_km ?? '', vehicle_number: ride?.vehicle_number || '', requested_seater: ride?.requested_seater || 4 }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const change = (name, value) => setForm(previous => ({ ...previous, [name]: value }));
  const company = companies.find(item => String(item.id) === String(form.company));
  const needsDistance = /zellis|dodge/i.test(company?.name || '');
  const submit = async event => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const payload = { ...form, driver: Number(form.driver), company: form.company ? Number(form.company) : null, ride_time: form.ride_time || null, total_km: form.total_km === '' ? null : form.total_km, requested_seater: Number(form.requested_seater) };
      if (ride) await adminAPI.updateRide(ride.id, payload); else await adminAPI.createRide(payload);
      onSuccess();
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };
  return <AdminModal title={ride ? 'Edit ride' : 'Add ride for driver'} onClose={onClose} busy={busy}>
    <form className="modal-form admin-tools-form" onSubmit={submit}>
      <p className="form-hint">This entry updates the selected driver’s rides, attendance and earnings.</p>
      {error && <p className="error-banner" role="alert">{error}</p>}
      <Field label="Driver"><select required value={form.driver} onChange={event => {
        const driver = drivers.find(item => String(item.id) === event.target.value);
        setForm(previous => ({ ...previous, driver: event.target.value, vehicle_number: driver?.default_vehicle_number || '', requested_seater: driver?.default_seater || 4 }));
      }}><option value="">Select driver</option>{drivers.filter(item => item.is_active || item.id === ride?.driver).map(driver => <option key={driver.id} value={driver.id}>{driver.name}{!driver.is_active ? ' (removed)' : ''}</option>)}</select></Field>
      <Field label="Company"><select value={form.company} onChange={event => change('company', event.target.value)}><option value="">No company</option>{companies.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}{ride?.company && !companies.some(item => item.id === ride.company) && <option value={ride.company}>{ride.company_name} (inactive)</option>}</select></Field>
      <div className="form-two-columns"><Field label="Ride date"><input type="date" required value={form.date} onChange={event => change('date', event.target.value)} /></Field><Field label="Time"><input type="time" value={form.ride_time} onChange={event => change('ride_time', event.target.value)} /></Field></div>
      <Field label="Trip type"><select value={form.trip_type} onChange={event => change('trip_type', event.target.value)}><option value="P">Pickup</option><option value="D">Drop</option></select></Field>
      <Field label="Route"><input maxLength={500} value={form.route} onChange={event => change('route', event.target.value)} placeholder="Route or destination" /></Field>
      {(form.pickup || form.drop) && <div className="form-two-columns"><Field label="Pickup location"><input maxLength={500} value={form.pickup} onChange={event => change('pickup', event.target.value)} /></Field><Field label="Drop location"><input maxLength={500} value={form.drop} onChange={event => change('drop', event.target.value)} /></Field></div>}
      <div className="form-two-columns"><Field label="Distance (km)"><input type="number" min="0" max="99999.99" step="0.01" required={needsDistance} value={form.total_km} onChange={event => change('total_km', event.target.value)} /></Field><Field label="Requested capacity"><select value={form.requested_seater} onChange={event => change('requested_seater', event.target.value)}><option value={4}>4 seater</option><option value={6}>6 seater</option></select></Field></div>
      <Field label="Vehicle"><select required value={form.vehicle_number} onChange={event => change('vehicle_number', event.target.value)}><option value="">Select vehicle</option>{vehicles.map(item => <option value={item.number} key={item.id}>{item.number} ({item.seater} seater)</option>)}{form.vehicle_number && !vehicles.some(item => item.number === form.vehicle_number) && <option value={form.vehicle_number}>{form.vehicle_number}</option>}</select></Field>
      <Field label="Notes"><textarea value={form.notes} onChange={event => change('notes', event.target.value)} rows={3} /></Field>
      <SaveActions busy={busy} onClose={onClose} label={ride ? 'Save ride' : 'Add ride'} />
    </form>
  </AdminModal>;
}

export function ChargeModal({ charge, drivers, vehicles, onClose, onSuccess }) {
  const [form, setForm] = useState(() => ({ driver: charge?.driver || '', date: charge?.date || today(), app_used: charge?.app_used || '', time: charge?.time?.slice(0, 5) || new Date().toTimeString().slice(0, 5), place: charge?.place || '', vehicle_number: charge?.vehicle_number || '', charge_amount: charge?.charge_amount ?? '' }));
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const change = event => setForm(previous => ({ ...previous, [event.target.name]: event.target.value }));
  const submit = async event => {
    event.preventDefault(); setBusy(true); setError('');
    try { const payload = { ...form, driver: form.driver ? Number(form.driver) : null }; if (charge) await adminAPI.updateCharge(charge.id, payload); else await adminAPI.createCharge(payload); onSuccess(); }
    catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };
  return <AdminModal title={charge ? 'Edit charging details' : 'Add charging details'} onClose={onClose} busy={busy}><form className="modal-form admin-tools-form" onSubmit={submit}>
    {error && <p className="error-banner" role="alert">{error}</p>}
    <Field label="Driver"><select name="driver" value={form.driver} onChange={change}><option value="">No driver / fleet expense</option>{drivers.filter(item => item.is_active || item.id === charge?.driver).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
    <div className="form-two-columns"><Field label="Charge date"><input name="date" type="date" required value={form.date} onChange={change} /></Field><Field label="Time"><input name="time" type="time" required value={form.time} onChange={change} /></Field></div>
    <Field label="Charging app"><input name="app_used" maxLength={100} required value={form.app_used} onChange={change} placeholder="e.g. Tata Power" /></Field>
    <Field label="Place"><input name="place" maxLength={200} required value={form.place} onChange={change} /></Field>
    <Field label="Vehicle"><select name="vehicle_number" required value={form.vehicle_number} onChange={change}><option value="">Select vehicle</option>{vehicles.map(item => <option key={item.id} value={item.number}>{item.number}</option>)}{form.vehicle_number && !vehicles.some(item => item.number === form.vehicle_number) && <option value={form.vehicle_number}>{form.vehicle_number}</option>}</select></Field>
    <Field label="Amount (₹)"><input name="charge_amount" type="number" min="0.01" max="99999999.99" step="0.01" required value={form.charge_amount} onChange={change} /></Field>
    <SaveActions busy={busy} onClose={onClose} label={charge ? 'Save charge' : 'Add charge'} />
  </form></AdminModal>;
}

export function AdvanceModal({ drivers, onClose, onSuccess }) {
  const [form, setForm] = useState({ driver: '', amount: '', reason: '', status: 'Paid', paid_date: today() });
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const change = event => setForm(previous => ({ ...previous, [event.target.name]: event.target.value }));
  const submit = async event => {
    event.preventDefault(); setBusy(true); setError('');
    try { const payload = { ...form }; if (payload.status !== 'Paid') delete payload.paid_date; await adminAPI.createAdvance(payload); onSuccess(); }
    catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };
  return <AdminModal title="Record driver advance" onClose={onClose} busy={busy}><form className="modal-form admin-tools-form" onSubmit={submit}>
    <p className="form-hint">Paid advances reduce net salary in the payment date’s salary cycle.</p>
    {error && <p className="error-banner" role="alert">{error}</p>}
    <Field label="Driver"><select name="driver" required value={form.driver} onChange={change}><option value="">Select driver</option>{drivers.filter(item => item.is_active).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
    <Field label="Advance amount (₹)"><input name="amount" type="number" required min="0.01" max="99999999.99" step="0.01" value={form.amount} onChange={change} /></Field>
    <Field label="Payment status"><select name="status" value={form.status} onChange={change}><option value="Paid">Already paid</option><option value="Pending">Pending payment</option></select></Field>
    {form.status === 'Paid' && <Field label="Payment date"><input name="paid_date" type="date" required max={today()} value={form.paid_date} onChange={change} /></Field>}
    <Field label="Reason / note"><textarea name="reason" maxLength={500} rows={3} value={form.reason} onChange={change} /></Field>
    <SaveActions busy={busy} onClose={onClose} label="Record advance" />
  </form></AdminModal>;
}

export function DriverManagement({ drivers, vehicles, onClose, onSuccess, initialDriver }) {
  const [editing, setEditing] = useState(initialDriver);
  const [search, setSearch] = useState(''); const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const remove = async () => {
    setBusy(true); setError('');
    try { await adminAPI.deleteDriver(removing.id); setRemoving(null); await onSuccess(); }
    catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };
  return <AdminModal title={editing === undefined ? 'Manage drivers' : editing ? 'Edit driver' : 'Add driver'} onClose={onClose} busy={busy}>
    {editing !== undefined ? <DriverForm key={editing?.id || 'new'} driver={editing} vehicles={vehicles} onCancel={() => setEditing(undefined)} onBusy={setBusy} onSuccess={async () => { setEditing(undefined); await onSuccess(); }} /> : <div className="modal-form">
      {error && <p className="error-banner" role="alert">{error}</p>}
      {removing ? <div className="delete-driver-confirm"><h4>Delete {removing.name}?</h4><p>Login access will be disabled. Ride, charge and salary history will be retained. You can restore access by editing this driver.</p><div className="modal-actions"><button className="btn-cancel" disabled={busy} onClick={() => setRemoving(null)}>Keep driver</button><button className="btn-danger" disabled={busy} onClick={remove}>{busy ? 'Removing…' : 'Delete driver'}</button></div></div> : <>
        <div className="management-toolbar"><input aria-label="Search drivers" placeholder="Search drivers…" value={search} onChange={event => setSearch(event.target.value)} /><button className="btn-submit" onClick={() => setEditing(null)}>+ Add driver</button></div>
        <div className="driver-management-list">{drivers.filter(item => `${item.name} ${item.phone} ${item.user?.username}`.toLowerCase().includes(search.toLowerCase())).map(driver => <div className="driver-management-row" key={driver.id}>
          <div><strong>{driver.name}</strong><span>{driver.user?.username} · {driver.is_active ? 'Active' : 'Removed'}</span></div>
          <div className="row-actions"><button className="text-action" onClick={() => setEditing(driver)} aria-label={`Edit ${driver.name}`}>Edit</button>{driver.is_active && <button className="text-action danger-text" onClick={() => setRemoving(driver)} aria-label={`Delete ${driver.name}`}>Delete</button>}</div>
        </div>)}</div>
      </>}
    </div>}
  </AdminModal>;
}

function DriverForm({ driver, vehicles, onCancel, onBusy, onSuccess }) {
  const [form, setForm] = useState({ name: driver?.name || '', username: driver?.user?.username || '', email: driver?.user?.email || '', phone: driver?.phone || '', password: '', is_active: driver?.is_active ?? true, default_vehicle_number: driver?.default_vehicle_number || '', default_seater: driver?.default_seater || 4 });
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const change = event => setForm(previous => ({ ...previous, [event.target.name]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));
  const submit = async event => {
    event.preventDefault(); setBusy(true); onBusy(true); setError('');
    try { const payload = { ...form }; if (!payload.password) delete payload.password; if (driver) await adminAPI.updateDriver(driver.id, payload); else await adminAPI.createDriver(payload); await onSuccess(); }
    catch (err) { setError(errorMessage(err)); } finally { setBusy(false); onBusy(false); }
  };
  return <form className="modal-form admin-tools-form" onSubmit={submit}>
    {error && <p className="error-banner" role="alert">{error}</p>}
    <Field label="Full name"><input name="name" maxLength={200} required value={form.name} onChange={change} /></Field>
    <Field label="Login username"><input name="username" maxLength={150} required value={form.username} onChange={change} autoComplete="off" /></Field>
    <Field label={driver ? 'New password (optional)' : 'Password'}><input name="password" type="password" required={!driver} minLength={6} value={form.password} onChange={change} autoComplete="new-password" /></Field>
    <p className="form-hint">Provide at least a phone number or email.</p>
    <Field label="Phone"><input name="phone" type="tel" maxLength={20} required={!form.email.trim()} value={form.phone} onChange={change} /></Field>
    <Field label="Email"><input name="email" type="email" required={!form.phone.trim()} value={form.email} onChange={change} /></Field>
    <Field label="Default vehicle"><select name="default_vehicle_number" value={form.default_vehicle_number} onChange={change}><option value="">No default vehicle</option>{vehicles.map(item => <option key={item.id} value={item.number}>{item.number}</option>)}{form.default_vehicle_number && !vehicles.some(item => item.number === form.default_vehicle_number) && <option value={form.default_vehicle_number}>{form.default_vehicle_number}</option>}</select></Field>
    <Field label="Default capacity"><select name="default_seater" value={form.default_seater} onChange={change}><option value={4}>4 seater</option><option value={6}>6 seater</option></select></Field>
    {driver && <label className="checkbox-field"><input name="is_active" type="checkbox" checked={form.is_active} onChange={change} />Active account (allow login)</label>}
    <SaveActions busy={busy} onClose={onCancel} label={driver ? 'Save driver' : 'Add driver'} />
  </form>;
}
