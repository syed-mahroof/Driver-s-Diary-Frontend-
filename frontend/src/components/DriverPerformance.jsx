import { Fragment, useId, useMemo, useState } from 'react';

const number = value => Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const money = value => `₹${number(value)}`;
const dateLabel = value => new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const PAGE_SIZE = 5;

export default function DriverPerformance({ data, loading, onAddRide, onEditDriver }) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  return <section className="performance-panel" aria-labelledby={`${id}-heading`} aria-busy={loading}>
    <div className="performance-heading">
      <div><span className="section-eyebrow">Fleet insights</span><h2 id={`${id}-heading`}>Driver performance</h2></div>
      <button type="button" className="performance-toggle" disabled={!data} aria-expanded={expanded} aria-controls={`${id}-details`} onClick={() => setExpanded(value => !value)}>
        {expanded ? 'Collapse' : 'Explore'}<span aria-hidden="true">{expanded ? '−' : '+'}</span>
      </button>
    </div>
    {data ? <>
      <p className="performance-period">{dateLabel(data.start_date)} – {dateLabel(data.end_date)} · {data.elapsed_days} elapsed {data.elapsed_days === 1 ? 'day' : 'days'}</p>
      <div className="performance-overview">
        <Metric label="Total trips" value={number(data.summary.trips)} />
        <Metric label="Fleet trips / day" value={number(data.summary.avg_trips_per_day)} />
        <Metric label="Distance logged" value={`${number(data.summary.total_km)} km`} />
        <Metric label="Charging cost" value={money(data.summary.charging_cost)} />
      </div>
      <p className="performance-status">{data.summary.trips ? `${data.summary.active_drivers} drivers with trips` : 'No trips in this period.'}</p>
    </> : <p className="performance-status" role="status">{loading ? 'Loading performance…' : 'Performance unavailable. Refresh to try again.'}</p>}
    <div id={`${id}-details`} hidden={!expanded}>
      {expanded && data && <PerformanceExplorer data={data} onAddRide={onAddRide} onEditDriver={onEditDriver} />}
    </div>
  </section>;
}

export function PerformanceExplorer({ data, onAddRide, onEditDriver }) {
  const [view, setView] = useState('drivers');
  const [selected, setSelected] = useState('');
  const [sort, setSort] = useState('trips');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const id = useId();
  const rows = useMemo(() => [...data.drivers]
    .filter(row => row.driver_name.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => Number(b[sort]) - Number(a[sort]) || a.driver_name.localeCompare(b.driver_name)), [data.drivers, sort, search]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const offset = (currentPage - 1) * PAGE_SIZE;
  const resetList = () => { setPage(1); setSelected(''); };
  const changePage = value => { setPage(value); setSelected(''); };
  return <div className="performance-explorer">
    <div className="performance-view-switch" role="group" aria-label="Performance views">
      <button type="button" aria-pressed={view === 'drivers'} onClick={() => setView('drivers')}>Drivers <span>{data.drivers.length}</span></button>
      <button type="button" aria-pressed={view === 'trends'} onClick={() => setView('trends')}>Trends</button>
    </div>
    {view === 'trends' ? <PerformanceCharts data={data} /> : <>
      <div className="performance-controls">
        <label>Search drivers<input type="search" value={search} onChange={event => { setSearch(event.target.value); resetList(); }} placeholder="Driver name" /></label>
        <label>Sort by<select value={sort} onChange={event => { setSort(event.target.value); resetList(); }}><option value="trips">Most trips</option><option value="avg_trips_per_day">Trips per day</option><option value="total_km">Distance</option><option value="target_progress">Salary target progress</option></select></label>
      </div>
      <div className="driver-performance-list">{rows.length ? rows.slice(offset, offset + PAGE_SIZE).map(row => {
        const isSelected = selected === String(row.driver_id);
        const detailId = `${id}-driver-${row.driver_id}`;
        return <Fragment key={row.driver_id}>
          <button type="button" className={`driver-performance-row ${isSelected ? 'selected' : ''}`} onClick={() => setSelected(isSelected ? '' : String(row.driver_id))} aria-expanded={isSelected} aria-controls={detailId}>
            <span className="performance-driver-name"><strong>{row.driver_name}</strong><small>{number(row.avg_trips_per_day)} trips/day · {number(row.total_km)} km{!row.is_active ? ' · Removed' : ''}</small></span>
            <span className="performance-driver-trips"><strong>{number(row.trips)}</strong><small>trips <span aria-hidden="true">{isSelected ? '−' : '+'}</span></small></span>
          </button>
          <div id={detailId} hidden={!isSelected}>
            {isSelected && <DriverDetail driver={row} data={data} onAddRide={onAddRide} onEditDriver={onEditDriver} />}
          </div>
        </Fragment>;
      }) : <p className="performance-status">{search.trim() ? 'No matching drivers.' : 'No drivers in this selection.'}</p>}</div>
      {rows.length > 0 && <div className="performance-pagination">
        <span role="status">{offset + 1}–{Math.min(offset + PAGE_SIZE, rows.length)} of {rows.length} drivers</span>
        {pages > 1 && <div><button type="button" className="text-action" aria-label="Previous drivers" disabled={currentPage === 1} onClick={() => changePage(currentPage - 1)}>Previous</button><button type="button" className="text-action" aria-label="Next drivers" disabled={currentPage === pages} onClick={() => changePage(currentPage + 1)}>Next</button></div>}
      </div>}
    </>}
    <details className="performance-definitions"><summary>How metrics work</summary><p className="performance-footnote">Trips / day uses elapsed calendar days, including days without trips. Active days have at least one trip. Attendance uses recorded days only. Charges and advances cannot be assigned to a company. Salary target: {money(data.salary_target)} per 16th–15th cycle.</p></details>
  </div>;
}

export function PerformanceCharts({ data }) {
  const [showDaily, setShowDaily] = useState(false);
  const id = useId();
  const trend = data.daily_trend;
  const max = Math.max(1, ...trend.map(day => day.trips));
  const totalTrips = data.summary.trips;
  if (!totalTrips) return <div className="performance-trends-empty"><strong>No trip activity yet</strong><p>Choose a wider date range to see daily activity and company mix.</p></div>;
  return <div className="performance-charts">
    <div className="performance-chart"><div className="chart-heading"><h3>Daily trip activity</h3><button type="button" className="text-action" onClick={() => setShowDaily(value => !value)} aria-expanded={showDaily} aria-controls={id}>{showDaily ? 'Hide data' : 'View data'}</button></div>
      <div className="activity-chart" role="img" aria-label={`${totalTrips} trips from ${dateLabel(data.start_date)} to ${dateLabel(data.end_date)}. Daily values available in View data.`}>
        <span className="chart-scale">{max} trips</span>
        <div className="activity-bars">{trend.map(day => <div key={day.date} className="activity-bar-track" title={`${dateLabel(day.date)}: ${day.trips} trips`}><div className="activity-bar" style={{ height: `${day.trips / max * 100}%` }} /></div>)}</div>
        <div className="chart-axis"><span>{dateLabel(data.start_date)}</span><span>{dateLabel(data.end_date)}</span></div>
      </div>
      <div id={id} hidden={!showDaily}>{showDaily && <div className="chart-data-table"><table><caption>Daily trips and distance</caption><thead><tr><th>Date</th><th>Trips</th><th>Distance (km)</th></tr></thead><tbody>{trend.map(day => <tr key={day.date}><th scope="row">{day.date}</th><td>{day.trips}</td><td>{number(day.km)}</td></tr>)}</tbody></table></div>}</div>
    </div>
    <div className="performance-chart"><h3>Company mix</h3><p className="chart-description">Share of trips in selected period</p><div className="company-bars">
      {data.companies.map(company => <div className="company-bar-row" key={company.name}><div><span>{company.name}</span><strong>{company.trips} <small>({Math.round(company.trips / totalTrips * 100)}%)</small></strong></div><div className="company-bar-track"><span style={{ width: `${company.trips / totalTrips * 100}%` }} /></div></div>)}
    </div></div>
  </div>;
}

function DriverDetail({ driver, data, onAddRide, onEditDriver }) {
  return <div className="driver-performance-detail"><div className="section-heading"><div><h3>{driver.driver_name}</h3><p>{driver.active_days} active days · Last trip: {driver.last_ride ? dateLabel(driver.last_ride) : 'No trips in selected period'}</p></div><div className="row-actions">{driver.is_active && <button type="button" className="btn-submit" onClick={() => onAddRide(driver.driver_id)}>+ Add ride</button>}<button type="button" className="btn-cancel" onClick={() => onEditDriver(driver.driver_id)}>Manage driver</button></div></div>
    <div className="performance-metrics"><Metric label="Trips / active day" value={number(driver.avg_trips_per_active_day)} detail={`${driver.pickups} pickups · ${driver.drops} drops`} /><Metric label="Ride earnings" value={money(driver.ride_earnings)} detail="Selected rides · before cycle incentive" /><Metric label="Charging cost" value={money(driver.charging_cost)} detail="Driver / vehicle scope" /><Metric label="Advance paid" value={money(driver.advance_paid)} detail="Selected payment dates" /></div>
    <div className="attendance-summary">{['Full', 'Half', 'Leave', 'Holiday'].map(status => <span key={status}>{status}: <strong>{driver.attendance[status] || 0}</strong></span>)}</div>
    <div className="cycle-summary"><h4>Current salary cycle · {dateLabel(data.cycle_start)} – {dateLabel(data.cycle_end)}</h4><p>All rides for this driver in this cycle. Company and vehicle filters do not change salary.</p><div className="cycle-target"><span>Salary target</span><strong>{number(driver.target_progress)}%</strong></div><div className="mini-progress"><span style={{ width: `${Math.min(100, driver.target_progress)}%` }} /></div><dl><div><dt>Gross earnings</dt><dd>{money(driver.current_cycle.gross_earnings)}</dd></div><div><dt>Paid advances</dt><dd>{money(driver.current_cycle.advance_paid)}</dd></div><div><dt>Net payable</dt><dd>{money(driver.current_cycle.net_payable)}</dd></div><div><dt>Incentive</dt><dd>{money(driver.current_cycle.incentive_earnings)}</dd></div></dl></div>
  </div>;
}

function Metric({ label, value, detail }) {
  return <div className="performance-metric"><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div>;
}
