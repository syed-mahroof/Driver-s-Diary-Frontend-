import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { useSync } from '../hooks/useSync';
import { driverAPI } from '../utils/api';
import { savePendingRide } from '../utils/db';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import '../styles/Driver.css';
import logoProfessional from '../assets/logo-professional.png';

const TODAY = new Date().toLocaleDateString('en-CA'); // Returns YYYY-MM-DD in local time

const pickupTimes = [
  { value: '06:00', label: '6:00 am' },
  { value: '08:30', label: '8:30 am' },
  { value: '09:00', label: '9:00 am' },
  { value: '10:00', label: '10:00 am' },
  { value: '11:00', label: '11:00 am' },
  { value: '13:00', label: '1:00 pm' },
  { value: '13:30', label: '1:30 pm' },
  { value: '16:30', label: '4:30 pm' },
  { value: '18:00', label: '6:00 pm' },
  { value: '18:30', label: '6:30 pm' },
  { value: '21:00', label: '9:00 pm' },
];

const dropTimes = [
  { value: '14:30', label: '2:30 pm' },
  { value: '15:30', label: '3:30 pm' },
  { value: '18:00', label: '6:00 pm' },
  { value: '18:30', label: '6:30 pm' },
  { value: '19:30', label: '7:30 pm' },
  { value: '20:30', label: '8:30 pm' },
  { value: '21:00', label: '9:00 pm' },
  { value: '22:00', label: '10:00 pm' },
  { value: '22:30', label: '10:30 pm' },
  { value: '00:00', label: '12:00 am' },
  { value: '00:30', label: '12:30 am' },
  { value: '02:00', label: '2:00 am' },
  { value: '03:00', label: '3:00 am' },
  { value: '03:30', label: '3:30 am' },
];

export default function DriverDashboard({ toggleTheme, theme }) {
  const { user, logout } = useAuth();
  const { isOnline, pendingCount, syncing, syncNow, refreshPendingCount } = useSync();
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [profileError, setProfileError] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showChargeForm, setShowChargeForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittingCharge, setSubmittingCharge] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [showChargeSuccess, setShowChargeSuccess] = useState(false);
  const [lastSavedCharge, setLastSavedCharge] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [seaterType, setSeaterType] = useState(4);
  const [showDefaultCarModal, setShowDefaultCarModal] = useState(false);
  const [showAdvanceSalaryModal, setShowAdvanceSalaryModal] = useState(false);
  const [editingRide, setEditingRide] = useState(null);

  const [form, setForm] = useState({
    date: TODAY,
    company: '',
    ride_time: '',
    trip_type: 'P',
    route: '',
    notes: '',
    total_km: '',
    vehicle_number: '',
  });

  const [chargeForm, setChargeForm] = useState({
    date: TODAY,
    app_used: '',
    time: '',
    place: '',
    vehicle_number: '',
    charge_amount: '',
  });

  const fetchDashboard = useCallback(async () => {
    if (!isOnline) return;
    try {
      const { data } = await driverAPI.getDashboard();
      setDashboard(data);
      setProfileError(false);
    } catch (err) {
      if (err.response?.status === 404) {
        setProfileError(true);
      } else {
        console.error('Dashboard fetch failed', err);
      }
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  const fetchCompanies = useCallback(async () => {
    try {
      const { data } = await driverAPI.getCompanies();
      setCompanies(data);
    } catch {}
  }, []);

  const fetchVehicles = useCallback(async () => {
    try {
      const { data } = await driverAPI.getVehicles();
      setVehicles(data);
    } catch {}
  }, []);

  useEffect(() => {
    fetchDashboard();
    fetchCompanies();
    fetchVehicles();
  }, [fetchDashboard, fetchCompanies, fetchVehicles]);

  useEffect(() => {
    if (showForm && dashboard) {
      setSeaterType(dashboard.default_seater || 4);
      setForm(prev => ({
        ...prev,
        vehicle_number: dashboard.default_vehicle_number || ''
      }));
    }
  }, [showForm, dashboard]);

  useEffect(() => {
    if (showChargeForm && dashboard) {
      setChargeForm(prev => ({
        ...prev,
        vehicle_number: dashboard.default_vehicle_number || ''
      }));
    }
  }, [showChargeForm, dashboard]);

  const handleFormChange = (e) => {
    setForm(prev => {
      const updated = { ...prev, [e.target.name]: e.target.value };
      if (e.target.name === 'trip_type') {
        updated.ride_time = '';
      }
      return updated;
    });
  };

  const handleAddRide = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const local_id = crypto.randomUUID();

    try {
      if (isOnline) {
        if (editingRide) {
          await driverAPI.updateRide(editingRide.id, {
            company: form.company || null,
            date: form.date,
            ride_time: form.ride_time || null,
            trip_type: form.trip_type,
            route: form.route,
            notes: form.notes,
            total_km: form.total_km || null,
            vehicle_number: form.vehicle_number,
            requested_seater: seaterType,
          });
          setSuccessMsg('Ride updated successfully!');
        } else {
          await driverAPI.createRide({
            local_id,
            company: form.company || null,
            date: form.date,
            ride_time: form.ride_time || null,
            trip_type: form.trip_type,
            route: form.route,
            pickup: '',
            drop: '',
            notes: form.notes,
            total_km: form.total_km || null,
            vehicle_number: form.vehicle_number,
            requested_seater: seaterType,
          });
          setSuccessMsg('Ride added successfully!');
        }
        fetchDashboard();
      } else {
        await savePendingRide({
          local_id,
          driver_id: user?.id,
          company_id: form.company || null,
          date: form.date,
          ride_time: form.ride_time || null,
          trip_type: form.trip_type,
          route: form.route,
          pickup: '',
          drop: '',
          notes: form.notes,
          total_km: form.total_km || null,
          vehicle_number: form.vehicle_number,
          requested_seater: seaterType,
        });
        await refreshPendingCount();
        setSuccessMsg('Ride saved offline. Will sync when online.');
        setDashboard(prev => prev
          ? { ...prev, today_rides: prev.today_rides + 1 }
          : prev
        );
      }

      setForm({
        date: TODAY,
        company: '',
        ride_time: '',
        trip_type: 'P',
        route: '',
        notes: '',
        total_km: '',
        vehicle_number: dashboard?.default_vehicle_number || '',
      });
      if (dashboard) setSeaterType(dashboard.default_seater || 4);
      setShowForm(false);
      setEditingRide(null);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      alert('Failed to save ride: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleChargeFormChange = (e) => {
    setChargeForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAddCharge = async (e) => {
    e.preventDefault();
    setSubmittingCharge(true);
    try {
      if (isOnline) {
        const savedData = {
          date: chargeForm.date,
          app_used: chargeForm.app_used,
          time: chargeForm.time,
          place: chargeForm.place,
          vehicle_number: chargeForm.vehicle_number,
          charge_amount: chargeForm.charge_amount,
        };
        await driverAPI.createCharge(savedData);
        setLastSavedCharge(savedData);
        setShowChargeSuccess(true);
      } else {
        alert('Offline saving for charge details is not yet supported. Please go online.');
      }

      setChargeForm({
        date: TODAY,
        app_used: '',
        time: '',
        place: '',
        vehicle_number: '',
        charge_amount: '',
      });
      setShowChargeForm(false);
    } catch (err) {
      alert('Failed to save charge details: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSubmittingCharge(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getBase64ImageFromURL = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.setAttribute("crossOrigin", "anonymous");
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL("image/png");
        resolve({ dataURL, width: img.width, height: img.height });
      };
      img.onerror = (error) => {
        reject(error);
      };
      img.src = url;
    });
  };

  const handleExportReport = async (period) => {
    try {
      const { data: report } = await driverAPI.getReportData(period);
      const doc = new jsPDF();
      
      // Load Logo
      let logoData = null;
      try {
        logoData = await getBase64ImageFromURL(logoProfessional);
      } catch (err) {
        console.error('Failed to load logo for PDF', err);
      }

      // Header Section
      let contentStartX = 14;
      if (logoData) {
        const maxWidth = 30;
        const maxHeight = 20;
        let finalWidth = maxWidth;
        let finalHeight = (logoData.height * maxWidth) / logoData.width;

        if (finalHeight > maxHeight) {
          finalHeight = maxHeight;
          finalWidth = (logoData.width * maxHeight) / logoData.height;
        }

        doc.addImage(logoData.dataURL, 'PNG', 14, 8, finalWidth, finalHeight);
        contentStartX = 14 + finalWidth + 6; // 6mm gap
      }

      // Report Title & Tagline
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(31, 58, 95); // Deep Blue
      doc.text("Driver's Diary", contentStartX, 22);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text("Premium Cab Services by HeadGreen!", contentStartX, 28);

      // Report Info (Right Aligned)
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.setFontSize(10);
      doc.setTextColor(31, 58, 95);
      doc.text(`Driver: ${report.driver_name}`, pageWidth - 14, 18, { align: 'right' });
      doc.text(`${period === 'month' ? 'Monthly' : 'Yearly'} Report`, pageWidth - 14, 24, { align: 'right' });
      doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, pageWidth - 14, 30, { align: 'right' });

      // Horizontal Line
      doc.setDrawColor(200);
      doc.line(14, 38, pageWidth - 14, 38);

      const tableData = [];
      let totalRides = 0;

      report.data.forEach(day => {
        if (day.rides.length === 0) {
          tableData.push([
            new Date(day.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
            '-',
            '-',
            '-',
            '-',
            'No rides recorded',
            '-'
          ]);
        } else {
          day.rides.forEach((ride, i) => {
            totalRides++;
            
            tableData.push([
              new Date(day.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
              i + 1,
              ride.company_name || '',
              ride.trip_type,
              ride.ride_time ? formatTime(ride.ride_time) : '',
              ride.route || '',
              ride.vehicle_number || ''
            ]);
          });
        }
      });

      autoTable(doc, {
        startY: 45,
        head: [['Date', 'No', 'Client', 'P/D', 'Time', 'Route', 'Vehicle']],
        body: tableData,
        theme: 'striped',
        headStyles: { 
          fillColor: [31, 58, 95], 
          fontStyle: 'bold',
          halign: 'center'
        },
        styles: { 
          fontSize: 9, 
          cellPadding: 3,
          valign: 'middle'
        },
        columnStyles: {
          0: { cellWidth: 20, halign: 'center' },
          1: { cellWidth: 10, halign: 'center' },
          3: { cellWidth: 12, halign: 'center' },
          4: { cellWidth: 22, halign: 'center' },
          6: { cellWidth: 25, halign: 'center' }
        }
      });

      // Summary Footer
      const finalY = doc.lastAutoTable.finalY + 15;
      doc.setFontSize(14);
      doc.setTextColor(31, 58, 95);
      doc.text(`Report Summary`, 14, finalY);
      
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.text(`Total Rides: ${totalRides}`, 14, finalY + 10);
      
      // Professional Footer
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text("© HeadGreen! - Confidential Report", pageWidth / 2, pageHeight - 10, { align: 'center' });

      doc.save(`${report.driver_name.replace(/\s+/g, '_')}_${period}_Report.pdf`);
      setMenuOpen(false);
    } catch (err) {
      console.error('PDF Error:', err);
      alert('Failed to generate PDF report');
    }
  };

  const target = 6;
  const rides = dashboard?.today_rides || 0;
  const progress = Math.min(100, (rides / target) * 100);

  let statusText = '';
  let progressTone = '';

  if (rides === 0) {
    statusText = 'Not Started';
    progressTone = 'red';
  } else if (rides >= 1 && rides <= 3) {
    statusText = 'In Progress';
    progressTone = 'yellow';
  } else if (rides >= 4 && rides < 6) {
    statusText = 'Good Performance';
    progressTone = 'light-green';
  } else {
    statusText = 'Excellent Performance';
    progressTone = 'dark-green';
  }

  return (
    <div className="driver-page">
      {/* Header */}
      <header className="driver-header">
        <div className="header-left">
          <img src="/logo.png" alt="Logo" className="header-logo-img" />
          <div className="header-title-container">
            <span className="header-title">Driver's Diary</span>
            <span className="header-subtext">By <span>HeadGreen!</span></span>
          </div>
        </div>
        <div className="header-right">
          
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
                  {pendingCount > 0 && (
                    <button 
                      className="dropdown-item" 
                      onClick={() => { syncNow(); setMenuOpen(false); }}
                      disabled={syncing || !isOnline}
                    >
                      <SyncIcon className={syncing ? 'spinning' : ''} />
                      {syncing ? 'Syncing...' : `Sync Data (${pendingCount})`}
                    </button>
                  )}
                  <div className="dropdown-divider"></div>
                  <button className="dropdown-item" onClick={() => handleExportReport('month')}>
                    <ReportIcon /> Monthly Report
                  </button>
                  <button className="dropdown-item" onClick={() => handleExportReport('year')}>
                    <YearlyIcon /> Yearly Report
                  </button>
                  <button className="dropdown-item" onClick={() => { setShowDefaultCarModal(true); setMenuOpen(false); }}>
                    <CarIconSmall /> Default Car
                  </button>
                  <button className="dropdown-item" onClick={() => { setShowAdvanceSalaryModal(true); setMenuOpen(false); }}>
                    <WalletIcon /> Advance Salary
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

      <main className="driver-main">
        {profileError ? (
          <div className="error-container">
            <div className="error-card">
              <div className="error-icon">🚫</div>
              <h2>Driver Profile Required</h2>
              <p>We couldn't find a driver profile for your account. This dashboard is only for registered drivers.</p>
              <div className="error-actions">
                <button className="btn-submit" onClick={handleLogout}>Logout & Switch Account</button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Welcome */}
            <div className="welcome-section">
              <div className="welcome-header">
                <h2>Good {getGreeting()}, {dashboard?.driver_name?.split(' ')[0] || user?.username}!</h2>
            <span className={`status-dot ${isOnline ? 'online' : 'offline'}`} title={isOnline ? 'Online' : 'Offline'} />
          </div>
          <p className="welcome-date">{formatDate(TODAY)}</p>
        </div>

        {/* Success message */}
        {successMsg && (
          <div className="success-banner">{successMsg}</div>
        )}

        {/* Offline banner */}
        {!isOnline && (
          <div className="offline-banner">
            You are offline. Rides will sync when connection is restored.
          </div>
        )}

        {/* Unified Stats Card */}
        <div className={`unified-stats-card ${progressTone}`}>
          <div className="unified-stats-top">
            <div className="stat-box">
              <span className="stat-label">TODAY'S RIDES</span>
              <span className="stat-value">{rides}</span>
            </div>
            <div className="stat-box align-right">
              <span className="stat-label">STATUS</span>
              <span className="stat-value status-text">{statusText}</span>
            </div>
          </div>
          
          <div className="unified-progress">
            <div className="progress-header">
              <span>Daily Progress</span>
              <span>{rides}/{target} rides</span>
            </div>
            <div className="progress-track">
              <div
                className={`progress-fill ${progressTone}`}
                style={{ width: `${rides === 0 ? 3 : progress}%` }}
              />
            </div>
            <div className="progress-markers">
              {Array.from({ length: target }, (_, i) => (
                <div key={i} className={`marker ${i < rides ? `done ${progressTone}` : ''}`} />
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons-grid">
          <button
            className="add-ride-btn"
            onClick={() => setShowForm(true)}
          >
            <PlusIcon /> Add Ride
          </button>
          <button
            className="add-charge-btn"
            onClick={() => setShowChargeForm(true)}
          >
            <ZapIcon /> Add Charge
          </button>
        </div>

        {/* Add Ride Form Modal */}
        {showForm && (
          <div className="modal-overlay" onClick={() => setShowForm(false)}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{editingRide ? 'Edit Ride' : 'Add New Ride'}</h3>
                <button className="modal-close" onClick={() => {
                  setShowForm(false);
                  setEditingRide(null);
                  setForm({
                    date: TODAY,
                    company: '',
                    ride_time: '',
                    trip_type: 'P',
                    route: '',
                    notes: '',
                    total_km: '',
                    vehicle_number: dashboard?.default_vehicle_number || '',
                  });
                  setSeaterType(dashboard?.default_seater || 4);
                }}>x</button>
              </div>

              <form onSubmit={handleAddRide} className="ride-form">
                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    name="date"
                    value={form.date}
                    onChange={handleFormChange}
                    required
                    max={TODAY}
                  />
                </div>

                <div className="form-group">
                  <label>Company</label>
                  <select name="company" value={form.company} onChange={handleFormChange} required>
                    <option value="">Select Company</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-row compact">
                  <div className="form-group">
                    <label>P/D</label>
                    <div className="trip-type-toggle">
                      <label className={`toggle-option ${form.trip_type === 'P' ? 'active' : ''}`}>
                        <input
                          type="radio"
                          name="trip_type"
                          value="P"
                          checked={form.trip_type === 'P'}
                          onChange={handleFormChange}
                        />
                        <span>Pickup</span>
                      </label>
                      <label className={`toggle-option ${form.trip_type === 'D' ? 'active' : ''}`}>
                        <input
                          type="radio"
                          name="trip_type"
                          value="D"
                          checked={form.trip_type === 'D'}
                          onChange={handleFormChange}
                        />
                        <span>Drop</span>
                      </label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Time</label>
                    <select name="ride_time" value={form.ride_time} onChange={handleFormChange} required>
                      <option value="">Select Time</option>
                      {(form.trip_type === 'P' ? pickupTimes : dropTimes).map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Route</label>
                  <input
                    type="text"
                    name="route"
                    value={form.route}
                    onChange={handleFormChange}
                    placeholder="e.g. Kundanoor"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={handleFormChange}
                    placeholder="Optional reminder for this ride"
                    rows={3}
                    maxLength={240}
                  />
                </div>

                <div className="form-row compact">
                  <div className="form-group">
                    <label>Total km</label>
                    <input
                      type="number"
                      name="total_km"
                      value={form.total_km}
                      onChange={handleFormChange}
                      placeholder="e.g. 30"
                      min="0"
                      step="0.1"
                      inputMode="decimal"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Vehicle Seater</label>
                    <div className="trip-type-toggle">
                      <label className={`toggle-option ${seaterType === 4 ? 'active' : ''}`}>
                        <input
                          type="radio"
                          name="seaterType"
                          value={4}
                          checked={seaterType === 4}
                          onChange={() => { setSeaterType(4); setForm(f => ({ ...f, vehicle_number: '' })); }}
                        />
                        <span>4 Seater</span>
                      </label>
                      <label className={`toggle-option ${seaterType === 6 ? 'active' : ''}`}>
                        <input
                          type="radio"
                          name="seaterType"
                          value={6}
                          checked={seaterType === 6}
                          onChange={() => { setSeaterType(6); setForm(f => ({ ...f, vehicle_number: '' })); }}
                        />
                        <span>6 Seater</span>
                      </label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Vehicle Number</label>
                    <select
                      name="vehicle_number"
                      value={form.vehicle_number}
                      onChange={handleFormChange}
                      required
                    >
                      <option value="">Select Vehicle</option>
                      {vehicles
                        .filter(v => seaterType === 4 ? true : v.seater === seaterType)
                        .map(v => (
                          <option key={v.id} value={v.number}>
                            {v.number} {v.seater === 6 && seaterType === 4 ? '(6 Seater)' : ''}
                          </option>
                        ))
                      }
                    </select>
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => {
                      setShowForm(false);
                      setEditingRide(null);
                      setForm({
                        date: TODAY,
                        company: '',
                        ride_time: '',
                        trip_type: 'P',
                        route: '',
                        notes: '',
                        total_km: '',
                        vehicle_number: dashboard?.default_vehicle_number || '',
                      });
                      setSeaterType(dashboard?.default_seater || 4);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-submit"
                    disabled={submitting}
                  >
                    {submitting ? 'Saving...' : editingRide ? 'Update Ride' : isOnline ? 'Save Ride' : 'Save Offline'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Charge Form Modal */}
        {showChargeForm && (
          <div className="modal-overlay" onClick={() => setShowChargeForm(false)}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Car Charge Details</h3>
                <button className="modal-close" onClick={() => setShowChargeForm(false)}>x</button>
              </div>

              <form onSubmit={handleAddCharge} className="ride-form">
                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    name="date"
                    value={chargeForm.date}
                    onChange={handleChargeFormChange}
                    required
                    max={TODAY}
                  />
                </div>

                <div className="form-group">
                  <label>App Used</label>
                  <select name="app_used" value={chargeForm.app_used} onChange={handleChargeFormChange} required>
                    <option value="">Select App</option>
                    <option value="Tata Power">Tata Power</option>
                    <option value="Zeon Charging">Zeon Charging</option>
                    <option value="Chargemod">Chargemod</option>
                    <option value="Statiq">Statiq</option>
                    <option value="Thunder+">Thunder+</option>
                    <option value="GoEc">GoEc</option>
                    <option value="ANERTEV">ANERTEV</option>
                    <option value="ESYGO">ESYGO</option>
                    <option value="KSEB">KSEB-KEMApp</option>
                    <option value="Other">Other</option>
                  </select>
                </div>


                <div className="form-row compact">
                  <div className="form-group">
                    <label>Time</label>
                    <input
                      type="time"
                      name="time"
                      value={chargeForm.time}
                      onChange={handleChargeFormChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Vehicle Number</label>
                    <select
                      name="vehicle_number"
                      value={chargeForm.vehicle_number}
                      onChange={handleChargeFormChange}
                      required
                    >
                      <option value="">Select Vehicle</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.number}>
                          {v.number} ({v.seater} Seater)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Place</label>
                  <input
                    type="text"
                    name="place"
                    value={chargeForm.place}
                    onChange={handleChargeFormChange}
                    required
                    placeholder="e.g. MG Road Charging Station"
                  />
                </div>

                <div className="form-group">
                  <label>Charge Amount (₹)</label>
                  <input
                    type="number"
                    name="charge_amount"
                    value={chargeForm.charge_amount}
                    onChange={handleChargeFormChange}
                    required
                    placeholder="e.g. 450.00"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                  />
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => setShowChargeForm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-submit"
                    disabled={submittingCharge || !isOnline}
                  >
                    {submittingCharge ? 'Saving...' : 'Save Charge'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Charge Saved Success Modal */}
        {showChargeSuccess && lastSavedCharge && (
          <div className="charge-success-overlay" onClick={() => setShowChargeSuccess(false)}>
            <div className="charge-success-card" onClick={e => e.stopPropagation()}>
              <div className="charge-success-icon-wrap">
                <div className="charge-success-pulse" />
                <svg className="charge-success-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <div className="charge-success-bolt">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                  </svg>
                </div>
              </div>

              <h3 className="charge-success-title">Charge Logged!</h3>
              <p className="charge-success-subtitle">Your vehicle charge details have been saved successfully.</p>

              <div className="charge-receipt">
                <div className="receipt-amount-container">
                  <span className="receipt-amount-label">Amount Paid</span>
                  <span className="receipt-amount-val">₹{Number(lastSavedCharge.charge_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                
                <div className="receipt-divider" />
                
                <div className="receipt-details">
                  <div className="receipt-row">
                    <span className="receipt-label">App Used</span>
                    <span className="receipt-val highlight-app">{lastSavedCharge.app_used}</span>
                  </div>
                  <div className="receipt-row">
                    <span className="receipt-label">Vehicle</span>
                    <span className="receipt-val">{lastSavedCharge.vehicle_number}</span>
                  </div>
                  <div className="receipt-row">
                    <span className="receipt-label">Location</span>
                    <span className="receipt-val truncate-text" title={lastSavedCharge.place}>{lastSavedCharge.place}</span>
                  </div>
                  <div className="receipt-row">
                    <span className="receipt-label">Time & Date</span>
                    <span className="receipt-val">
                      {formatTime(lastSavedCharge.time)} • {new Date(`${lastSavedCharge.date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>

              <button 
                type="button" 
                className="charge-success-btn"
                onClick={() => setShowChargeSuccess(false)}
              >
                Awesome, Got it!
              </button>
            </div>
          </div>
        )}

        {/* Recent Rides */}
        {dashboard?.recent_rides?.length > 0 && (
          <div className="recent-section">
            <h3 className="section-title">Today's Rides</h3>
            <div className="rides-list">
              {dashboard.recent_rides.map((ride, i) => (
                <div key={ride.id} className="ride-item">
                  <div className="ride-number">#{i + 1}</div>
                  <div className="ride-details">
                    <div className="ride-route">
                      <span className="pickup">{ride.route || ride.company_name || 'Ride added'}</span>
                      {ride.trip_type && <span className="arrow">{ride.trip_type === 'P' ? 'Pickup' : 'Drop'}</span>}
                    </div>
                    {ride.notes && (
                      <div className="ride-note">
                        <span className="note-dot" aria-hidden="true" />
                        {ride.notes}
                      </div>
                    )}
                    <div className="ride-meta">
                      {ride.company_name && <span className="company-tag">{ride.company_name}</span>}
                      {ride.ride_time && <span><ClockIcon /> {formatTime(ride.ride_time)}</span>}
                      {ride.trip_type && <span>{ride.trip_type}</span>}
                      {ride.total_km && <span><RulerIcon /> {Number(ride.total_km).toLocaleString('en-IN')} km</span>}
                      {ride.vehicle_number && (
                        <span>
                          <CarIconSmall /> {ride.vehicle_number}
                          {ride.requested_seater === 4 && vehicles.find(v => v.number === ride.vehicle_number)?.seater === 6 && (
                            <span className="mixed-usage-badge" title="6 Seater used as 4">6s as 4</span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  <button 
                    className="edit-ride-btn" 
                    onClick={() => {
                      setEditingRide(ride);
                      setForm({
                        date: ride.date,
                        company: ride.company || '',
                        ride_time: ride.ride_time || '',
                        trip_type: ride.trip_type,
                        route: ride.route || '',
                        notes: ride.notes || '',
                        total_km: ride.total_km || '',
                        vehicle_number: ride.vehicle_number || '',
                      });
                      setSeaterType(ride.requested_seater || 4);
                      setShowForm(true);
                    }}
                    title="Edit Ride"
                  >
                    <EditIcon />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {pendingCount > 0 && (
          <div className="pending-notice">
            {pendingCount} ride(s) pending sync
          </div>
        )}
        {showDefaultCarModal && (
          <DefaultCarModal
            onClose={() => setShowDefaultCarModal(false)}
            onSuccess={() => {
              setShowDefaultCarModal(false);
              fetchDashboard();
            }}
            vehicles={vehicles}
            currentSeater={dashboard?.default_seater}
            currentNumber={dashboard?.default_vehicle_number}
          />
        )}
        {showAdvanceSalaryModal && (
          <AdvanceSalaryModal
            onClose={() => setShowAdvanceSalaryModal(false)}
            onSuccess={(msg) => {
              setShowAdvanceSalaryModal(false);
              setSuccessMsg(msg);
              setTimeout(() => setSuccessMsg(''), 4000);
            }}
          />
        )}
          </>
        )}
      </main>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}

function formatDate(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

function formatTime(value) {
  if (!value) return '';
  const [hours, minutes] = value.split(':');
  return new Date(2000, 0, 1, Number(hours), Number(minutes)).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Icons
const SunIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
);
const MoonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
);
const ReportIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
);
const YearlyIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
);
const SyncIcon = ({ className }) => (
  <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
);
const LogoutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
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
const ZapIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
);
const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
);
const EditIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
);

function DefaultCarModal({ onClose, onSuccess, vehicles, currentSeater, currentNumber }) {
  const [seater, setSeater] = useState(currentSeater || 4);
  const [number, setNumber] = useState(currentNumber || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await driverAPI.updateDefaultVehicle({
        default_vehicle_number: number,
        default_seater: seater
      });
      onSuccess();
    } catch (err) {
      alert('Failed to update default car: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Set Default Car</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="ride-form">
          <div className="form-group">
            <label>Seater Type</label>
            <div className="trip-type-toggle">
              <label className={`toggle-option ${seater === 4 ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="seater"
                  value={4}
                  checked={seater === 4}
                  onChange={() => { setSeater(4); setNumber(''); }}
                />
                <span>4 Seater</span>
              </label>
              <label className={`toggle-option ${seater === 6 ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="seater"
                  value={6}
                  checked={seater === 6}
                  onChange={() => { setSeater(6); setNumber(''); }}
                />
                <span>6 Seater</span>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label>Vehicle Number</label>
            <select
              value={number}
              onChange={e => setNumber(e.target.value)}
              required
            >
              <option value="">Select Vehicle</option>
              {vehicles
                .filter(v => seater === 4 ? true : v.seater === seater)
                .map(v => (
                  <option key={v.id} value={v.number}>
                    {v.number} {v.seater === 6 && seater === 4 ? '(6 Seater)' : ''}
                  </option>
                ))
              }
            </select>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Saving...' : 'Set as Default'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const WalletIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>
);

function AdvanceSalaryModal({ onClose, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount.');
      return;
    }
    setLoading(true);
    try {
      await driverAPI.requestAdvanceSalary({ amount: parseFloat(amount), reason });
      onSuccess('Advance salary request submitted successfully!');
    } catch (err) {
      alert('Failed to submit request: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Request Advance Salary</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="ride-form">
          <div className="form-group">
            <label>Amount (₹)</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
              placeholder="e.g. 2000"
              min="1"
              step="1"
              inputMode="numeric"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Reason (optional)</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Why do you need an advance?"
              rows={3}
              maxLength={500}
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
