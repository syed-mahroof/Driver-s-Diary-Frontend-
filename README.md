# Driver-s-Diary-Frontend-
Full-stack cab management system built with Django REST Framework and React (Vite). Features real-time ride manifests, driver vehicle preferences, PWA support, and advanced PDF reporting. Powered by PostgreSQL, SimpleJWT, and Gunicorn. Rebranded as Driver's Diary by Head Green!

## Admin workspace

Admins can create and edit rides and charging expenses for a selected driver, record a pending or paid salary advance, and manage driver accounts. Ride edits recalculate attendance for both the old and new driver/date. Use the manifest's **Edit** action for rides and **Charging Cost Details → Edit charge** for expenses.

**Delete driver** disables the account and keeps ride, charge, attendance and salary history. Removed drivers remain in **Manage drivers**. Edit the account and enable **Active account** to restore it.

Driver, vehicle and company filters support multiple checkboxes. An empty selection means all records. Choices within each filter are combined with OR; different filters are combined with AND. Dashboard requests, Excel and PDF exports use the same selections.

Fleet insights starts collapsed with four compact totals. Choose **Explore** to open the **Drivers** or **Trends** view. The driver list shows five compact rows per page, supports search and sorting, and expands one driver's details directly below that row. Empty trends use a short message instead of empty chart cards. **Collapse** returns to the summary; metric explanations are a separate optional disclosure.

The performance panel includes trips, distance, activity days, calendar-day and active-day trip averages, daily activity, company mix, attendance, charging costs, paid advances and salary-cycle progress. The selected reporting period affects activity metrics; the salary section always shows that driver's entire current 16th–15th cycle. Charging expenses and salary advances have no company relationship, so company filters do not allocate those amounts. Performance periods are limited to 366 days.

Charts use the app's existing CSS and React stack, with a daily data table, accessible labels and no additional chart dependency. New entry forms use native dialogs for focus containment and Escape support. Both dashboards use visible keyboard focus, reduced-motion support and improved contrast.

## Verification

From `frontend`:

```sh
npm ci
npm test
npm run build
```

The tests cover filter serialization, single- and multi-selection PDF columns, filter accessibility markup, empty charts and escaped user content. Backend integration tests are documented in the backend repository.

Dashboard routes, PDF generation and celebrations load on demand. Offline rides are scoped to the signed-in account, acknowledged retries leave the queue, sync is guarded against overlapping requests, and refresh tokens rotate through a shared refresh request.

Visual browser verification was blocked by the execution environment's localhost network restrictions and browser URL policy. Manual checks remain: admin and driver screens in both themes at 320, 360, 375, 390, 414, 768, 1024, 1440 and 1920 CSS pixels, landscape orientation, enlarged text, keyboard navigation, dialog scrolling, checkbox selection, edit flows and generated PDFs. These checks have not been claimed as completed.
