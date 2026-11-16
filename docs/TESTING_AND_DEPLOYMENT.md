# Testing and Deployment Report

Date: 13 Nov 2026. Tested against the production build (`npm run build`, served with `npm run preview`) in Chrome 156.

## Automated checks

| Check | Result |
| --- | --- |
| `npm run build` (TypeScript type-check + Vite production build) | Passed, no errors |
| `npm run lint` (Oxlint) | Passed, no warnings |

## Scripted browser tests (Playwright driving Chrome)

**Page sweep.** All 19 routes were loaded at four viewports (desktop 1440×900, laptop 1280×720, tablet 820×1180, mobile 390×844) in both light and dark themes: 152 page loads. Each load was checked for console errors, uncaught exceptions, horizontal page overflow, correct theme attribute and rendered content. Result: 0 problems.

Routes: Dashboard, POS, Products, Add Product, Categories, Brands, Import/Export, Inventory, Customers, Customer Details, Reports, Expenses, E-commerce Overview, Platform Products, Platform Orders, Sync Logs, Platform Settings, Platform dashboard (Amazon), Settings.

**Interaction tests.** Run at desktop, tablet and mobile sizes; 57 of 57 checks passed (19 per size):

- Theme: System follows the OS setting on first load and when the OS setting changes; Dark chosen from the top-bar dropdown; Dark persists after reload; Light and System chosen from Settings; `localStorage` value verified each time.
- POS: add two products to the cart, complete the sale, receipt shown (via the slide-up bill on tablet/mobile).
- Products: Add Product opens the scanner page; edit modal opens and closes with Escape; search filters the table.
- E-commerce: order details modal opens from the orders table; status filter works; platform settings modal opens, switches section and saves; platform connect toggle updates the connected count.
- Customers and Expenses: add modals open.
- Navigation: sidebar link (desktop) and drawer link (tablet/mobile) navigate correctly.
- No console errors during any run.

## Manual visual review

Screenshots of the dashboard, e-commerce overview (dark), POS (mobile), platform orders (mobile, dark) and products (tablet) were reviewed for layout and theme consistency.

## Not tested

- Camera barcode scanning with a physical camera: BLOCKED, the test machine has no camera. The manual-entry and sample-barcode fallbacks were exercised.
- Firefox and Safari: not run.
- Real devices: not run; tablet and mobile were tested as emulated viewports in desktop Chrome.

## Deployment

- Production build configuration: done (`vite.config.ts`, relative base, hash routing).
- GitHub Pages workflow: included at `.github/workflows/deploy.yml`.
- Repository: https://github.com/awsbedrock-cell/mobi_public (public).
- Production URL: https://awsbedrock-cell.github.io/mobi_public/ — GitHub Pages serving the `gh-pages` branch, which the workflow rebuilds on every push to `main`.
- Verified against the production URL (Chrome via Playwright): page sweep 19 routes x 4 viewports x light/dark with 0 problems; interaction suite 57/57; gap suite 103/105 (same 2 mobile test-selector failures as locally).
- Backend/API: none required; the app runs on bundled sample data. `VITE_API_BASE_URL` is reserved for a future API.

## Gap-analysis pass (reference comparison)

Changes made to the existing app (no rebuild):

| Area | Added |
| --- | --- |
| Add Product | "AI Product Scan (Optional)" — rule-based, in-browser detection of brand, category, storage, colour and a suggested SKU from a typed name (no external AI service). Scanner can now read a barcode from an uploaded photo. |
| Add/Edit Product modal | Real product image upload (stored in memory as a data URL) shown in product lists. |
| E-commerce Products | Delete with confirmation, "Unlist everywhere", select-all, row action menu. |
| E-commerce Orders | Date-range filter. "View on …" opens the marketplace seller portal. |
| Sync Logs | Event filter and date-range filter alongside platform and status. |
| Platform Settings | API Settings section (seller ID, API key, save & reconnect, disconnect). Credentials are in-memory only. |
| Platform dashboard | Overview / Products / Orders / Sync Logs tabs scoped to that marketplace. |
| Customer Details | Billing history table with CSV export; notes are editable and saved. POS sales record the payment method on the invoice. |
| Header | Removed the non-functional sign-out item (the app has no authentication). |

Results after the pass (production build, Chrome via Playwright):

- `npm run build`: passed. `npm run lint`: passed, no warnings.
- Page sweep: 19 routes x 4 viewports x light/dark — 0 problems.
- Original interaction suite: 57/57 passed.
- New gap suite (desktop, tablet, mobile): 103/105 passed. The 2 failures are the mobile Sync Logs filter assertions: the test selector looks for the log ID, which the mobile card layout does not show. The filter itself was confirmed working on mobile by screenshot, not by an automated assertion.
- BLOCKED / not run: live camera scanning and photo barcode decoding with a real barcode (no camera or sample photo on the test machine), Firefox, Safari, physical devices.

## Multi-brand and dynamic branding

Run on the local production build in Chrome (emulated viewports). After deployment (commit `9e60fa7`), the brand suite (453 of 453) and the page sweep (0 problems) were re-run against https://awsbedrock-cell.github.io/mobi_public/ with the same results.

| Check | Result |
| --- | --- |
| `npm run build`, `npm run lint` | Pass, no warnings |
| Brand suite: 3 brands × 19 routes × light/dark × desktop/tablet/mobile, plus token, data, persistence, store switching, preview, create/edit/delete brand and permission checks | 453 of 453 passed |
| Existing page sweep (19 routes × 4 sizes × light/dark) | 0 problems |
| Existing interaction suite | 57 of 57 passed |
| Existing gap suite | 103 of 105 passed (same two mobile Sync Logs test-selector failures as before) |

Not tested: logo upload with a real image file, Firefox, Safari, real devices, offline use (brand fonts come from Google Fonts).

## Backend and live mode (16 Nov 2026)

- Frontend (live mode): https://mobi-hztj.onrender.com — API: https://mobi-api-bkvo.onrender.com (Render free web service + PostgreSQL, from `render.yaml`). GitHub Pages stays in demo mode.
- Server tests (`cd server && npm test`): 14 of 14 passed; marketplace responses are mocked.
- Browser test on the Render URLs (Chrome, desktop): 9 of 9 passed — store initialised in the database, POS sale saved (invoice number and stock), data unchanged after reload, all six marketplaces disconnected with no sample orders, wrong admin key rejected, partner-only note for Meesho, no console errors.
- Local only: Amazon's real token endpoint rejected made-up credentials and the app showed the error.
- Not tested: a successful Amazon or Flipkart connection and order import against a real seller account (no credentials), data surviving a Render restart, live mode on tablet/mobile sizes.
- Not built: catalogue import, pushing listings/price/stock to marketplaces, user login (data endpoints are unauthenticated; only marketplace actions need `ADMIN_KEY`).

## Sign-in (live mode)

- Server tests: 17 of 17 passed, including: no data without a session, forged tokens rejected, setup needs `ADMIN_KEY` and works once, passwords stored hashed, Owner-only routes refuse a Cashier, removed accounts lose access, login lockout after 8 wrong passwords.
- Browser test on a local live build (Chrome, desktop): 13 of 13 passed — owner setup, wrong admin key, account menu, adding a cashier, POS sale saved, reload keeps the session, sign out, wrong password, cashier restrictions, invalid session returns to login.
- The marketplace form no longer asks for the admin key; the Store Owner's session is used instead.
