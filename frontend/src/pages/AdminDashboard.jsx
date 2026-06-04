import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { adminAPI } from '../utils/api';
import '../styles/Admin.css';

export default function AdminDashboard({ toggleTheme, theme }) {
  const authCtx = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Modals state
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showAdvancePanel, setShowAdvancePanel] = useState(false);
  const [showChargesModal, setShowChargesModal] = useState(false);
  const [showMonthlyReportModal, setShowMonthlyReportModal] = useState(false);
  const [advanceRequests, setAdvanceRequests] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedDates, setExpandedDates] = useState(new Set());

  const toggleDate = (date) => {
    setExpandedDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const today = new Date().toLocaleDateString('en-CA');
  const yesterday = new Date(new Date().setDate(new Date().getDate() - 1)).toLocaleDateString('en-CA');
  const firstOfMonth = today.slice(0, 8) + '01';

  const getLastMonthRange = () => {
    const d = new Date();
    const firstOfLastMonth = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    const lastOfLastMonth = new Date(d.getFullYear(), d.getMonth(), 0);
    return {
      start: firstOfLastMonth.toLocaleDateString('en-CA'),
      end: lastOfLastMonth.toLocaleDateString('en-CA'),
    };
  };
  const { start: lastMonthStart, end: lastMonthEnd } = getLastMonthRange();

  const getWeekStart = () => {
    const d = new Date();
    const day = d.getDay(); // 0: Sun, 1: Mon, ...
    const diff = d.getDate() - (day === 0 ? 6 : day - 1); // Monday as start
    return new Date(d.setDate(diff)).toLocaleDateString('en-CA');
  };
  const weekStart = getWeekStart();

  const [filters, setFilters] = useState({
    start_date: today,
    end_date: today,
    driver_id: '',
    company_id: '',
  });

  const isActive = (start, end) => filters.start_date === start && filters.end_date === end;

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== '')
      );
      const [statsRes, reportsRes, driversRes, companiesRes] = await Promise.all([
        adminAPI.getDashboard(params),
        adminAPI.getReports(params),
        adminAPI.getDrivers(),
        adminAPI.getCompanies(),
      ]);
      setStats(statsRes.data);
      setReports(reportsRes.data);
      setDrivers(driversRes.data);
      setCompanies(companiesRes.data);
    } catch (err) {
      console.error('Admin fetch failed', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const fetchAdvanceRequests = useCallback(async () => {
    try {
      const { data } = await adminAPI.getAdvanceRequests();
      setAdvanceRequests(data);
    } catch (err) {
      console.error('Failed to fetch advance requests', err);
    }
  }, []);

  useEffect(() => { fetchAdvanceRequests(); }, [fetchAdvanceRequests]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    if (value === 'ADD_NEW_DRIVER') {
      setShowDriverModal(true);
      return;
    }
    if (value === 'ADD_NEW_COMPANY') {
      setShowCompanyModal(true);
      return;
    }
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== '')
      );
      const response = await adminAPI.exportExcel(params);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `ride_manifest_${filters.start_date}_${filters.end_date}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const serverMessage = err.response?.data?.error || err.response?.data?.detail;
      alert(`Export failed: ${serverMessage || err.message}`);
    } finally {
      setExporting(false);
    }
  };

  const handleLogout = () => {
    authCtx.logout();
    navigate('/login');
  };

  const groupedReports = groupReportsByDate(reports);

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="header-left">
          <img src="/logo.png" alt="Logo" className="header-logo-img" />
          <div className="header-title-container">
            <span className="header-title">Driver's Diary</span>
            <span className="header-subtext">By <span>HeadGreen!</span></span>
          </div>
          <span className="header-badge">Admin</span>
        </div>
        <div className="header-right">
          <div className="notif-container">
            <button
              className="notif-btn"
              onClick={() => { setShowAdvancePanel(!showAdvancePanel); fetchAdvanceRequests(); }}
              title="Advance Salary Requests"
            >
              <BellIcon />
              {stats?.pending_advance_count > 0 && (
                <span className="notif-badge">{stats.pending_advance_count}</span>
              )}
            </button>
          </div>
          <span className="admin-user">{authCtx?.user?.username}</span>
          <div className="menu-container">
            <button 
              className="menu-btn" 
              onClick={() => setMenuOpen(!menuOpen)}
              title="Menu"
            >
              ⋮
            </button>
            {menuOpen && (
              <>
                <div className="dropdown-overlay" onClick={() => setMenuOpen(false)} />
                <div className="dropdown-menu">
                  <button className="dropdown-item" onClick={() => { toggleTheme(); setMenuOpen(false); }}>
                    {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
                    {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                  </button>
                  <button className="dropdown-item" onClick={() => { setShowVehicleModal(true); setMenuOpen(false); }}>
                    <CarIcon /> Add Vehicle
                  </button>
                  <button className="dropdown-item" onClick={() => { setShowMonthlyReportModal(true); setMenuOpen(false); }}>
                    <FileTextIcon /> Monthly Report
                  </button>
                  <div className="dropdown-divider"></div>
                  <button className="dropdown-item logout-text" onClick={handleLogout}>
                    <LogoutIcon /> Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="admin-main">
        <div className="filter-panel">
          <h3 className="filter-title">Filters</h3>
          <div className="filter-grid">
            <div className="form-group">
              <label>From Date</label>
              <input type="date" name="start_date" value={filters.start_date} onChange={handleFilterChange} />
            </div>
            <div className="form-group">
              <label>To Date</label>
              <input type="date" name="end_date" value={filters.end_date} onChange={handleFilterChange} />
            </div>
            <div className="form-group">
              <label>Driver</label>
              <select name="driver_id" value={filters.driver_id} onChange={handleFilterChange}>
                <option value="">All Drivers</option>
                {drivers.map(driver => (
                  <option key={driver.id} value={driver.id}>{driver.name}</option>
                ))}
                <option value="ADD_NEW_DRIVER" style={{ color: 'var(--accent)', fontWeight: 'bold' }}>+ Add New Driver</option>
              </select>
            </div>
            <div className="form-group">
              <label>Company</label>
              <select name="company_id" value={filters.company_id} onChange={handleFilterChange}>
                <option value="">All Companies</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
                <option value="ADD_NEW_COMPANY" style={{ color: 'var(--accent)', fontWeight: 'bold' }}>+ Add New Company</option>
              </select>
            </div>
            <div className="filter-actions">
              <button className="btn-filter" onClick={fetchAll}>Apply</button>
              <button className="btn-export" onClick={handleExport} disabled={exporting}>
                {exporting ? 'Exporting...' : 'Export Excel'}
              </button>
            </div>
          </div>

          <div className="quick-ranges">
            <button 
              className={isActive(today, today) ? 'active' : ''} 
              onClick={() => setFilters(f => ({ ...f, start_date: today, end_date: today }))}
            >
              Today
            </button>
            <button 
              className={isActive(yesterday, yesterday) ? 'active' : ''} 
              onClick={() => setFilters(f => ({ ...f, start_date: yesterday, end_date: yesterday }))}
            >
              Yesterday
            </button>
            <button 
              className={isActive(weekStart, today) ? 'active' : ''} 
              onClick={() => setFilters(f => ({ ...f, start_date: weekStart, end_date: today }))}
            >
              This Week
            </button>
            <button 
              className={isActive(firstOfMonth, today) ? 'active' : ''} 
              onClick={() => setFilters(f => ({ ...f, start_date: firstOfMonth, end_date: today }))}
            >
              This Month
            </button>
            <button 
              className={isActive(lastMonthStart, lastMonthEnd) ? 'active' : ''} 
              onClick={() => setFilters(f => ({ ...f, start_date: lastMonthStart, end_date: lastMonthEnd }))}
            >
              Last Month
            </button>
            <button 
              className={isActive(getYearStart(), today) ? 'active' : ''} 
              onClick={() => setFilters(f => ({ ...f, start_date: getYearStart(), end_date: today }))}
            >
              This Year
            </button>
          </div>
        </div>

        {stats && (
          <div className="overview-stats-container">
            <div className="stats-header">
              <h3>Quick Overview</h3>
            </div>
            
            <div className="stats-layers">
              {/* Layer 1: Total Rides + Companies */}
              <div className="stats-layer full-layer rides-layer">
                <div className="rides-left-section">
                  <div className="layer-icon-box blue">
                    <CarIcon />
                  </div>
                  <div className="layer-value-group">
                    <span className="layer-large-value blue">{stats.total_rides}</span>
                    <span className="layer-label">Total Rides</span>
                  </div>
                </div>
                
                <div className="rides-right-section">
                  <div className="company-chips-row">
                    {(stats.company_breakdown || [])
                      .sort((a, b) => b.count - a.count)
                      .map(c => (
                      <div className="company-stat-chip" key={c.name}>
                        <span className="chip-name">{c.name}</span>
                        <span className="chip-count">{c.count}</span>
                        {c.name.toLowerCase() === 'zellis' && c.total_km > 0 && (
                          <span className="chip-km">{c.total_km.toLocaleString('en-IN')} km</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Layer 2: Two Halves */}
              <div className="stats-layer split-layer">
                <div className="layer-half">
                  <div className="layer-icon-box purple">
                    <UsersIcon />
                  </div>
                  <div className="layer-content">
                    <div className="layer-value purple">{stats.total_drivers}</div>
                    <div className="layer-label">Active Drivers</div>
                  </div>
                </div>
                <div className="layer-half">
                  <div className="layer-icon-box yellow-bg">
                    <SunIconSmall />
                  </div>
                  <div className="layer-content">
                    <div className="layer-value yellow">{stats.drivers_target_achieved}/{stats.total_drivers}</div>
                    <div className="layer-label">Drivers Target Achieved</div>
                  </div>
                </div>
              </div>

              {/* Layer 3: Advance Salary */}
              <div className="stats-layer full-layer advance-layer">
                <div className="layer-icon-box teal">
                  <WalletIcon />
                </div>
                <div className="layer-content">
                  <div className="layer-value teal">
                    Rs {Number(stats.total_advance_paid || 0).toLocaleString('en-IN')}
                  </div>
                  <div className="layer-label">Advance Salary Paid</div>
                  {stats.advance_paid_drivers?.length > 0 && (
                    <div className="layer-subtitle">({stats.advance_paid_drivers.join(', ')})</div>
                  )}
                </div>
              </div>

              {/* Layer 4: Charging Cost */}
              <div 
                className="stats-layer full-layer charging-layer interactive-layer"
                onClick={() => setShowChargesModal(true)}
              >
                <div className="layer-icon-box amber">
                  <BoltIcon />
                </div>
                <div className="layer-content">
                  <div className="layer-value amber">
                    Rs {Number(stats.total_charging_cost || 0).toLocaleString('en-IN')}
                  </div>
                  <div className="layer-label">Total Charging Cost</div>
                  <div className="clickable-hint">Click to view breakdown</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <section className="manifest-section">
          <div className="table-header">
            <div>
              <h3>Daily Ride Manifest</h3>
              <span className="manifest-range">{formatDate(filters.start_date)} to {formatDate(filters.end_date)}</span>
            </div>
            <span className="table-count">{reports.length} driver days</span>
          </div>

          {loading ? (
            <div className="loading-state">Loading...</div>
          ) : reports.length === 0 ? (
            <div className="empty-state">No records found for selected filters.</div>
          ) : (
            <div className="manifest-days">
              {groupedReports.map(day => {
                const isExpanded = expandedDates.has(day.date);
                return (
                  <article className={`manifest-day ${isExpanded ? 'expanded' : ''}`} key={day.date}>
                    <div className="manifest-date" onClick={() => toggleDate(day.date)} role="button">
                      <div className="date-text">
                        <strong>{formatSheetDate(day.date)}</strong>
                        <span>{formatWeekday(day.date)}</span>
                      </div>
                      <span className="expand-icon">{isExpanded ? '−' : '+'}</span>
                    </div>
                    {isExpanded && (
                      <div className="manifest-content">
                        <div className="manifest-note">NOTE</div>
                        {day.rows.map(row => (
                          <DriverManifest key={`${row.driver_id}-${row.date}`} row={row} />
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {showAdvancePanel && (
        <div className="modal-overlay" onClick={() => setShowAdvancePanel(false)}>
          <div className="modal-card advance-modal-card" onClick={e => e.stopPropagation()}>
            <AdvanceRequestsPanel
              requests={advanceRequests}
              onUpdate={async (id, newStatus) => {
                try {
                  await adminAPI.updateAdvanceRequest(id, { status: newStatus });
                  fetchAdvanceRequests();
                  fetchAll();
                } catch (err) {
                  alert('Failed to update: ' + (err.response?.data?.error || err.message));
                }
              }}
              onClose={() => setShowAdvancePanel(false)}
            />
          </div>
        </div>
      )}

      {showChargesModal && (
        <div className="modal-overlay" onClick={() => setShowChargesModal(false)}>
          <div className="modal-card charging-modal-card" onClick={e => e.stopPropagation()}>
            <ChargingDetailsPanel
              charges={stats?.charging_details || []}
              onClose={() => setShowChargesModal(false)}
            />
          </div>
        </div>
      )}

      {showDriverModal && (
        <AddDriverModal
          onClose={() => setShowDriverModal(false)}
          onSuccess={() => {
            setShowDriverModal(false);
            fetchAll();
          }}
        />
      )}

      {showCompanyModal && (
        <AddCompanyModal
          onClose={() => setShowCompanyModal(false)}
          onSuccess={() => {
            setShowCompanyModal(false);
            fetchAll();
          }}
        />
      )}

      {showVehicleModal && (
        <AddVehicleModal
          onClose={() => setShowVehicleModal(false)}
          onSuccess={() => {
            setShowVehicleModal(false);
            fetchAll();
          }}
        />
      )}

      {showMonthlyReportModal && (
        <MonthlyReportModal
          onClose={() => setShowMonthlyReportModal(false)}
        />
      )}
    </div>
  );
}

function AddDriverModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ username: '', password: '', name: '', phone: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  const hasPhone = form.phone.trim().length > 0;
  const hasEmail = form.email.trim().length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hasPhone && !hasEmail) {
      setLocalError('Please provide at least a phone number or email.');
      return;
    }
    setLocalError('');
    setLoading(true);
    try {
      await adminAPI.createDriver(form);
      onSuccess();
    } catch (err) {
      alert('Failed to add driver: ' + (err.response?.data?.detail || JSON.stringify(err.response?.data) || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add New Driver</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          {localError && <div className="error-banner">{localError}</div>}
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={e => { setForm({ ...form, name: e.target.value }); setLocalError(''); }}
              placeholder="e.g. John Doe"
            />
          </div>
          <div className="form-group">
            <label>Username (for login)</label>
            <input
              type="text"
              required
              value={form.username}
              onChange={e => { setForm({ ...form, username: e.target.value }); setLocalError(''); }}
              placeholder="e.g. johndoe123"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={e => { setForm({ ...form, password: e.target.value }); setLocalError(''); }}
              placeholder="Min 6 characters"
              minLength={6}
            />
          </div>
          <div className="contact-hint-inline">
            <span className="hint-icon">ℹ</span> At least one of phone or email is required
          </div>
          <div className="form-group">
            <label>
              Phone{!hasEmail && <span className="required-dot" title="Required when email is empty">*</span>}
            </label>
            <input
              type="text"
              value={form.phone}
              onChange={e => { setForm({ ...form, phone: e.target.value }); setLocalError(''); }}
              placeholder="e.g. 9876543210"
            />
          </div>
          <div className="form-group">
            <label>
              Email{!hasPhone && <span className="required-dot" title="Required when phone is empty">*</span>}
            </label>
            <input
              type="email"
              value={form.email}
              onChange={e => { setForm({ ...form, email: e.target.value }); setLocalError(''); }}
              placeholder="e.g. john@email.com"
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Driver'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddCompanyModal({ onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await adminAPI.createCompany({ name });
      onSuccess();
    } catch (err) {
      alert('Failed to add company: ' + (err.response?.data?.detail || JSON.stringify(err.response?.data) || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add New Company</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Company Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Reliance"
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Company'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddVehicleModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ number: '', seater: 4 });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await adminAPI.createVehicle(form);
      onSuccess();
    } catch (err) {
      alert('Failed to add vehicle: ' + (err.response?.data?.detail || JSON.stringify(err.response?.data) || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add New Vehicle</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Seater Type</label>
            <div className="trip-type-toggle">
              <label className={`toggle-option ${form.seater === 4 ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="seater"
                  value={4}
                  checked={form.seater === 4}
                  onChange={() => setForm({ ...form, seater: 4 })}
                />
                <span>4 Seater</span>
              </label>
              <label className={`toggle-option ${form.seater === 6 ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="seater"
                  value={6}
                  checked={form.seater === 6}
                  onChange={() => setForm({ ...form, seater: 6 })}
                />
                <span>6 Seater</span>
              </label>
            </div>
          </div>
          <div className="form-group">
            <label>Vehicle Number</label>
            <input
              type="text"
              required
              value={form.number}
              onChange={e => setForm({ ...form, number: e.target.value })}
              placeholder="e.g. 0680"
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Vehicle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MetricCard({ tone, value, label, subtitle, icon }) {
  return (
    <div className={`metric-card ${tone}`}>
      <div className="metric-icon-wrap">
        <span className="metric-icon">{icon}</span>
      </div>
      <div className="metric-content">
        <div className="metric-value">{value}</div>
        <div className="metric-label">{label}</div>
        {subtitle && <div className="metric-subtitle">{subtitle}</div>}
      </div>
    </div>
  );
}

function DriverManifest({ row }) {
  const rideRows = row.rides?.length ? row.rides : Array.from({ length: Math.max(row.total_rides, 1) }, () => null);
  const displayRows = padRows(rideRows, Math.max(7, rideRows.length));

  // Build company summary
  const companySummary = {};
  (row.rides || []).forEach(ride => {
    if (!ride) return;
    const name = ride.company_name || 'Other';
    if (!companySummary[name]) companySummary[name] = { count: 0, km: 0 };
    companySummary[name].count += 1;
    companySummary[name].km += parseFloat(ride.total_km || 0);
  });

  const statusClass = row.status === 'Full' ? 'full' : row.status === 'Half' ? 'half' : row.status === 'Leave' ? 'leave' : row.status === 'Holiday' ? 'holiday' : 'half';
  const statusLabel = row.status === 'Leave' ? 'Leave' : row.status === 'Holiday' ? 'Holiday' : `${row.status} Day`;

  return (
    <div className="driver-manifest">
      <div className="driver-manifest-title">
        <span>Driver Name: {row.driver_name}</span>
        <span className={`attendance-badge ${statusClass}`}>{statusLabel}</span>
      </div>

      <div className="manifest-table-wrap">
        <table className="manifest-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>Client</th>
              <th>P/D</th>
              <th>Time</th>
              <th>Route</th>
              <th>Total km</th>
              <th>Vehicle</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((ride, index) => (
              <tr key={ride?.id || `blank-${index}`}>
                <td>{index + 1}</td>
                <td>{ride?.company_name || ''}</td>
                <td>{ride?.trip_type || ''}</td>
                <td>{ride?.ride_time ? formatTime(ride.ride_time) : ''}</td>
                <td>
                  <div>{formatRoute(ride)}</div>
                  {ride?.notes && (
                    <div className="ride-note-admin">
                      <span className="note-dot-admin" aria-hidden="true" />
                      {ride.notes}
                    </div>
                  )}
                </td>
                <td>{ride?.total_km ? Number(ride.total_km).toLocaleString('en-IN') : ''}</td>
                <td>{ride?.vehicle_number || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="manifest-mobile-list">
        {rideRows.filter(Boolean).length === 0 ? (
          <div className="manifest-ride-card muted">No ride entries for this day.</div>
        ) : rideRows.filter(Boolean).map((ride, index) => (
          <div className="manifest-ride-card" key={ride.id}>
            <div className="manifest-card-top">
              <strong>#{index + 1} {ride.company_name || 'Client'}</strong>
              <span className="trip-badge">{ride.trip_type || 'P'}</span>
            </div>
            <div className="manifest-route">{formatRoute(ride)}</div>
            {ride.notes && (
              <div className="ride-note-admin">
                <span className="note-dot-admin" aria-hidden="true" />
                {ride.notes}
              </div>
            )}
            <div className="manifest-card-meta">
              {ride.ride_time && <span><ClockIcon /> {formatTime(ride.ride_time)}</span>}
              {ride.total_km && <span><RulerIcon /> {Number(ride.total_km).toLocaleString('en-IN')} km</span>}
              {ride.vehicle_number && <span><CarIconSmall /> {ride.vehicle_number}</span>}
            </div>
          </div>
        ))}
      </div>

      {Object.keys(companySummary).length > 0 && (
        <div className="company-summary">
          {Object.entries(companySummary).map(([name, data]) => (
            <span className="company-chip" key={name}>
              {name}
              <span className="chip-count">{data.count}</span>
              {name.toLowerCase() === 'zellis' && data.km > 0 && (
                <span className="chip-km">{data.km.toLocaleString('en-IN')} km</span>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function groupReportsByDate(rows) {
  const map = new Map();
  rows.forEach(row => {
    if (!map.has(row.date)) map.set(row.date, []);
    map.get(row.date).push(row);
  });
  return Array.from(map, ([date, dayRows]) => ({ date, rows: dayRows }));
}

function padRows(rows, count) {
  return [...rows, ...Array.from({ length: Math.max(0, count - rows.length) }, () => null)];
}

function formatRoute(ride) {
  if (!ride) return '';
  return ride.route || [ride.pickup, ride.drop].filter(Boolean).join(' to ');
}

function formatDate(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

function formatSheetDate(dateStr) {
  const value = new Date(`${dateStr}T00:00:00`);
  return value.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: '2-digit' });
}

function formatWeekday(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long' });
}

function formatTime(value) {
  const [hours, minutes] = value.split(':');
  return new Date(2000, 0, 1, Number(hours), Number(minutes)).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getYearStart() {
  return `${new Date().getFullYear()}-01-01`;
}

const SunIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
);
const BoltIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-10z"/></svg>
);
const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
);
const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
);
const ClockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);
const RulerIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-5-5a1 1 0 0 0-1.42 0l-1.17 1.17a1 1 0 0 1-1.42 0L5.4 6.88a1 1 0 0 1 0-1.42l1.17-1.17a1 1 0 0 0 0-1.42L1.56.87a1 1 0 0 0-1.42 0L.14 1a1 1 0 0 0 0 1.42l5 5a1 1 0 0 0 1.42 0l1.17-1.17a1 1 0 0 1 1.42 0L16.5 13.5a1 1 0 0 1 0 1.42l-1.17 1.17a1 1 0 0 0 0 1.42l5 5a1 1 0 0 0 1.42 0l.01-.01a1 1 0 0 0 0-1.42Z"/></svg>
);
const CarIconSmall = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.2-1.4.7l-1.5 2c-.3.4-.4.9-.4 1.4v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
);
const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
);
const SunIconSmall = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
);
const CarIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.2-1.4.7l-1.5 2c-.3.4-.4.9-.4 1.4v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
);
const UsersIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);
const WalletIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>
);

function AdvanceRequestsPanel({ requests, onUpdate, onClose }) {
  const pending = requests.filter(r => r.status === 'Pending');
  const resolved = requests.filter(r => r.status !== 'Pending');

  return (
    <section className="advance-panel">
      <div className="advance-panel-header">
        <h3>Advance Salary Requests</h3>
        <button className="modal-close" onClick={onClose}>&times;</button>
      </div>

      {pending.length === 0 && resolved.length === 0 && (
        <div className="empty-state">No advance salary requests found.</div>
      )}

      {pending.length > 0 && (
        <>
          <h4 className="advance-section-title pending-title">
            <span className="pulse-dot"></span>
            Pending ({pending.length})
          </h4>
          <div className="advance-list">
            {pending.map(req => (
              <div key={req.id} className="advance-card pending">
                <div className="advance-card-top">
                  <strong>{req.driver_name}</strong>
                  <span className="advance-amount">₹{Number(req.amount).toLocaleString('en-IN')}</span>
                </div>
                {req.reason && <div className="advance-reason">{req.reason}</div>}
                <div className="advance-card-meta">
                  <span>{new Date(req.request_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  <span>{new Date(req.request_date).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</span>
                </div>
                <div className="advance-actions">
                  <button className="btn-paid" onClick={() => onUpdate(req.id, 'Paid')}>
                    ✓ Mark Paid
                  </button>
                  <button className="btn-reject" onClick={() => onUpdate(req.id, 'Rejected')}>
                    ✕ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {resolved.length > 0 && (
        <>
          <h4 className="advance-section-title">History ({resolved.length})</h4>
          <div className="advance-list">
            {resolved.map(req => (
              <div key={req.id} className={`advance-card ${req.status.toLowerCase()}`}>
                <div className="advance-card-top">
                  <strong>{req.driver_name}</strong>
                  <span className="advance-amount">₹{Number(req.amount).toLocaleString('en-IN')}</span>
                </div>
                {req.reason && <div className="advance-reason">{req.reason}</div>}
                <div className="advance-card-meta">
                  <span>{new Date(req.request_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  <span className={`status-tag ${req.status.toLowerCase()}`}>{req.status}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function ChargingDetailsPanel({ charges, onClose }) {
  return (
    <section className="charging-panel">
      <div className="charging-panel-header">
        <h3>Charging Cost Details</h3>
        <button className="modal-close" onClick={onClose}>&times;</button>
      </div>

      {charges.length === 0 ? (
        <div className="empty-state">No charging records found for the selected period.</div>
      ) : (
        <div className="charging-list">
          {charges.map(charge => (
            <div key={charge.id} className="charging-card">
              <div className="charging-card-top">
                <div className="charging-driver-info">
                  <strong>{charge.driver_name}</strong>
                  <span className="charging-vehicle">{charge.vehicle_number}</span>
                </div>
                <span className="charging-amount">₹{Number(charge.charge_amount).toLocaleString('en-IN')}</span>
              </div>
              <div className="charging-card-middle">
                <span className="charging-app-tag">{charge.app_used}</span>
                <span className="charging-place">{charge.place}</span>
              </div>
              <div className="charging-card-meta">
                <span>{formatDate(charge.date)}</span>
                <span>{charge.time}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const FileTextIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
);

function MonthlyReportModal({ onClose }) {
  const currentYear = new Date().getFullYear();
  
  // Set default to last month
  const getPrevMonthAndYear = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return {
      month: d.getMonth() + 1,
      year: d.getFullYear()
    };
  };
  
  const prevDate = getPrevMonthAndYear();
  const [month, setMonth] = useState(prevDate.month);
  const [year, setYear] = useState(prevDate.year);
  const [loading, setLoading] = useState(false);

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  const years = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await adminAPI.exportMonthlyReport(month, year);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      
      const monthLabel = months.find(m => m.value === Number(month))?.label || month;
      a.download = `monthly_report_${monthLabel}_${year}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
      let errorMsg = err.message;
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          errorMsg = parsed.error || parsed.detail || errorMsg;
        } catch (_) {}
      } else {
        errorMsg = err.response?.data?.error || err.response?.data?.detail || errorMsg;
      }
      alert(`Export failed: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Monthly Company Report</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Select Month</label>
            <select value={month} onChange={e => setMonth(Number(e.target.value))}>
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Select Year</label>
            <select value={year} onChange={e => setYear(Number(e.target.value))}>
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Exporting...' : 'Export Excel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
