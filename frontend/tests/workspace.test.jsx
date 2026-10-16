import React from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { filterParams, selectionValues } from '../src/utils/filters';
import { resolveReportIdentity } from '../src/utils/generateAdminPdfReport';
import DriverPerformance, { PerformanceExplorer, PerformanceCharts } from '../src/components/DriverPerformance';
import MultiSelectFilter from '../src/components/MultiSelectFilter';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../src/store/AuthContext';
import AdminDashboard from '../src/pages/AdminDashboard';
import DriverDashboard from '../src/pages/DriverDashboard';

test('multi-selection serializes consistently for dashboard and exports', () => {
  assert.deepEqual(filterParams({ start_date: '2026-10-01', driver_id: ['1', '2'], company_id: ['3'], vehicle_number: ['0622', '0656'] }), { start_date: '2026-10-01', driver_id: '1,2', company_id: '3', vehicle_number: '0622,0656' });
});
test('empty selections mean all records and are omitted from API parameters', () => {
  assert.deepEqual(filterParams({ driver_id: [], company_id: [], vehicle_number: [], start_date: '2026-10-01', end_date: '2026-10-16' }), { start_date: '2026-10-01', end_date: '2026-10-16' });
});
test('report selection accepts legacy scalar and new array values', () => {
  assert.deepEqual(selectionValues('1,2'), ['1', '2']);
  assert.deepEqual(selectionValues([1, 2]), ['1', '2']);
  assert.deepEqual(selectionValues(''), []);
});
const identities = { companies: [{ id: 1, name: 'Cognizant' }, { id: 2, name: 'Zellis' }], drivers: [{ id: 1, name: 'Adhil' }, { id: 2, name: 'Ashrin' }] };
test('unfiltered PDF keeps company, driver and vehicle columns', () => {
  const identity = resolveReportIdentity({ ...identities, filters: { driver_id: [], company_id: [], vehicle_number: [] } });
  assert.equal(identity.hasCompany, false); assert.equal(identity.hasDriver, false); assert.equal(identity.hasVehicle, false);
  assert.equal(identity.title, 'All Rides');
});
test('PDF retains distinguishing columns for multi-selection', () => {
  const identity = resolveReportIdentity({ ...identities, filters: { driver_id: ['1', '2'], company_id: ['1', '2'], vehicle_number: ['0622', '0656'] } });
  assert.equal(identity.hasCompany, false); assert.equal(identity.hasDriver, false); assert.equal(identity.hasVehicle, false);
  assert.match(identity.subtitle, /2 companies/); assert.match(identity.subtitle, /2 drivers/); assert.match(identity.subtitle, /2 vehicles/);
});
test('single-selection PDF uses selected names and hides redundant columns', () => {
  const identity = resolveReportIdentity({ ...identities, filters: { driver_id: ['1'], company_id: ['2'], vehicle_number: ['0622'] } });
  assert.equal(identity.title, 'Zellis'); assert.equal(identity.driverLabel, 'Adhil'); assert.equal(identity.vehicleLabel, '0622');
  assert.equal(identity.hasCompany, true); assert.equal(identity.hasDriver, true); assert.equal(identity.hasVehicle, true);
});
test('filter trigger announces selection count and expansion state', () => {
  const html = renderToStaticMarkup(<MultiSelectFilter label="Drivers" options={[{ value: 1, label: 'Adhil' }]} value={['1']} onChange={() => {}} />);
  assert.match(html, /1 selected/); assert.match(html, /aria-expanded="false"/); assert.match(html, /aria-controls=/);
});
test('empty performance state renders zero values without NaN or division errors', () => {
  const data = { start_date: '2026-10-01', end_date: '2026-10-02', elapsed_days: 2, salary_target: 20000,
    summary: { trips: 0, active_drivers: 0, total_km: 0, avg_trips_per_day: 0, charging_cost: 0 }, drivers: [], daily_trend: [{ date: '2026-10-01', trips: 0 }], companies: [] };
  const html = renderToStaticMarkup(<DriverPerformance data={data} loading={false} />);
  assert.doesNotMatch(html, /NaN|Infinity/); assert.match(html, /No trips in this period/);
  assert.match(html, /aria-expanded="false"/); assert.match(html, /Explore/);
  assert.doesNotMatch(html, /Daily trip activity|Company mix|Search drivers|How metrics work/);
});
test('performance renders activity and escapes user-provided names', () => {
  const data = { start_date: '2026-10-01', end_date: '2026-10-02', elapsed_days: 2, salary_target: 20000,
    summary: { trips: 4, active_drivers: 1, total_km: 40, avg_trips_per_day: 2, charging_cost: 100 },
    drivers: [{ driver_id: 1, driver_name: '<script>test</script>', is_active: true, trips: 4, active_days: 1, avg_trips_per_day: 2, total_km: 40, target_progress: 10 }],
    daily_trend: [{ date: '2026-10-01', trips: 4 }, { date: '2026-10-02', trips: 0 }], companies: [{ name: 'Cognizant', trips: 4 }] };
  const html = renderToStaticMarkup(<PerformanceExplorer data={data} />);
  assert.match(html, /&lt;script&gt;test&lt;\/script&gt;/); assert.doesNotMatch(html, /<script>/);
  const charts = renderToStaticMarkup(<PerformanceCharts data={data} />);
  assert.match(charts, /4 trips from/); assert.match(charts, /100%/);
});

test('collapsed insights keep summary totals visible without rendering the driver list', () => {
  const data = performanceFixture(12);
  const html = renderToStaticMarkup(<DriverPerformance data={data} loading={false} />);
  for (const label of ['Total trips', 'Fleet trips / day', 'Distance logged', 'Charging cost']) assert.ok(html.includes(label), label);
  assert.doesNotMatch(html, /Driver 01|performance-charts|performance-controls|driver-performance-row/);
  assert.match(html, /hidden=""/); assert.match(html, /aria-controls=/);
});
test('explorer shows five compact drivers with pagination and details closed', () => {
  const html = renderToStaticMarkup(<PerformanceExplorer data={performanceFixture(12)} />);
  assert.equal((html.match(/class="driver-performance-row /g) || []).length, 5);
  assert.match(html, /1–5 of 12 drivers/);
  assert.match(html, /aria-label="Previous drivers" disabled=""/);
  assert.match(html, /aria-label="Next drivers"/);
  assert.doesNotMatch(html, /Driver 06|driver-performance-detail|performance-charts/);
});
test('a short driver list needs no page buttons and zero trips need no chart boxes', () => {
  const data = performanceFixture(2);
  const html = renderToStaticMarkup(<PerformanceExplorer data={data} />);
  assert.match(html, /1–2 of 2 drivers/); assert.doesNotMatch(html, /Previous drivers|Next drivers/);
  const empty = renderToStaticMarkup(<PerformanceCharts data={{ ...data, summary: { ...data.summary, trips: 0 } }} />);
  assert.match(empty, /No trip activity yet/); assert.doesNotMatch(empty, /performance-chart"|activity-bars|company-bars/);
});

function performanceFixture(count) {
  return {
    start_date: '2026-10-01', end_date: '2026-10-16', elapsed_days: 16, salary_target: 20000,
    summary: { trips: 12, active_drivers: 2, total_km: 120, avg_trips_per_day: .75, charging_cost: 200 },
    drivers: Array.from({ length: count }, (_, index) => ({ driver_id: index + 1, driver_name: `Driver ${String(index + 1).padStart(2, '0')}`, is_active: true, trips: 0, avg_trips_per_day: 0, total_km: 0, target_progress: 0 })),
    daily_trend: [], companies: [],
  };
}

function renderDashboard(Component, isAdmin) {
  const storage = new Map([['user', JSON.stringify({ id: 1, username: 'Preview', isAdmin })]]);
  globalThis.localStorage = { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } });
  return renderToStaticMarkup(<MemoryRouter><AuthProvider><Component theme="dark" toggleTheme={() => {}} /></AuthProvider></MemoryRouter>);
}
test('admin dashboard renders new entry points without browser effects', () => {
  const html = renderDashboard(AdminDashboard, true);
  for (const label of ['Fleet overview', '+ Add ride', '+ Add charge', '+ Record advance', 'Manage drivers']) assert.ok(html.includes(label), label);
  assert.match(html, /All drivers/); assert.match(html, /All companies/);
});
test('driver dashboard renders correct daily label after date and import changes', () => {
  const html = renderDashboard(DriverDashboard, false);
  assert.match(html, /TODAY&#x27;S RIDES/);
  assert.doesNotMatch(html, /localToday\(\)/);
});
