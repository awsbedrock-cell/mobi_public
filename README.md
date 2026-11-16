# Mobi — Mobile Shop Management System

A responsive shop-management front end for mobile phone retailers: billing, catalogue, stock, customers, reports, expenses and multi-marketplace listing.

Built with React 19, TypeScript, Vite, Tailwind CSS and Lucide React icons.

## Modules

| Area | Screens |
| --- | --- |
| Dashboard | Quick actions, sales trend, top products, stock alerts, expense summary |
| Sales (POS) | Product search, barcode entry, cart, discount, GST, payment mode, receipt |
| Products | Catalogue, add/edit product, barcode/QR scanner, bulk CSV upload, categories, brands, import/export |
| Inventory | Stock summary, status filters, stock adjustment |
| Customers | Customer list, add customer, customer details with purchase history |
| Reports | Sales summary, period chart, category breakdown, best sellers, CSV export |
| Expenses | Expense list, category breakdown, add/delete expense |
| E-commerce Platforms | Overview, platform products, platform orders, order details, sync logs, platform settings, per-platform dashboard |
| Settings | Theme, brand palette preview, store profile, notifications |

## Getting started

Requires Node.js 20 or newer.

```bash
npm install
cp .env.example .env   # optional
npm run dev            # http://localhost:5173
```

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server with hot reload |
| `npm run build` | Type-check and create the production build in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run Oxlint |

## Environment variables

Copy `.env.example` to `.env`. Never commit `.env`.

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Base URL of a backend API. Leave empty to run on the bundled sample data. |
| `VITE_STORE_NAME` | Store name shown in the app. |

## Data and backend

The app currently runs on in-memory sample data (`src/data/mock.ts`) managed by `src/context/StoreContext.tsx`. Changes such as sales, stock adjustments and new products work during a session and reset on reload. There is no backend yet; to connect one, replace the mutators in `StoreContext` with API calls against `VITE_API_BASE_URL`. Pages only use the `useStore()` hook, so they need no changes.

## Theming and branding

All colours, radii, shadows and fonts are design tokens defined once in `src/styles/tokens.css` (light values under `:root`, dark values under `[data-theme='dark']`). `tailwind.config.ts` maps them to Tailwind utilities such as `bg-primary`, `bg-surface`, `text-text-muted`, `border-border` and `text-success`. Components use only these utilities.

To rebrand, edit the token values in `src/styles/tokens.css`. For example, change `--color-primary` to change the Mobi purple everywhere. Values are space-separated RGB triplets so Tailwind opacity modifiers (`bg-primary/10`) keep working.

Marketplace logo colours (Amazon, Flipkart and so on) are third-party brand colours and live with the platform data in `src/data/mock.ts`, not in the theme.

The theme switcher (top bar and Settings) offers Light, Dark and System. The choice is saved in `localStorage` under `mobi-theme`; System follows the operating-system setting live. `src/theme/ThemeProvider.tsx` holds the logic, and a small inline script in `index.html` applies the theme before first paint.

## Project structure

```
src/
  components/
    ui/          Button, Card, Badge, Modal, Dropdown, Tabs, DataTable, Pagination, Toast, form fields
    layout/      Sidebar, Topbar, BottomNav, ThemeSwitcher, AppLayout
    charts/      SVG line, bar and donut charts
    products/    Product form modal, barcode scanner, stock badge
    ecommerce/   Platform logo, order details modal, platform settings modal
  context/       StoreContext (application state)
  data/          Types and sample data
  lib/           Formatting and CSV helpers
  pages/         One component per screen; ecommerce/ holds the marketplace screens
  styles/        tokens.css (design tokens), index.css (Tailwind layers)
  theme/         ThemeProvider
```

## Responsive behaviour

- Desktop and laptop: fixed sidebar, multi-column layouts, full tables.
- Tablet: sidebar becomes a drawer, layouts reflow to fewer columns.
- Mobile: bottom navigation, tables become stacked cards, modals become bottom sheets, POS cart becomes a slide-up bill.

## Barcode scanner

The scanner uses the browser `BarcodeDetector` API and the camera (`getUserMedia`), which need HTTPS or `localhost`. Where the API or camera is unavailable (for example Firefox or Safari), the scanner falls back to manual barcode entry.

## Deployment

The build is fully static, uses relative asset paths and hash routing, so `dist/` can be served from any static host or sub-path without rewrite rules.

**GitHub Pages (included):** `.github/workflows/deploy.yml` lints, builds and publishes `dist` to the `gh-pages` branch on every push to `main`. GitHub Pages serves that branch (Settings → Pages → Source: "Deploy from a branch", `gh-pages`, `/ (root)`). Live site: https://awsbedrock-cell.github.io/mobi_public/

**Other hosts (Vercel, Netlify, S3, Nginx):** build command `npm run build`, output directory `dist`.

See [docs/TESTING_AND_DEPLOYMENT.md](docs/TESTING_AND_DEPLOYMENT.md) for the test and deployment report.

## Multi-brand and dynamic branding

One account can hold several brands, each with its own stores, logo, palette, typography and component styling.

- **Brand switcher** (top right) changes the active brand. The whole UI re-themes at once because a brand only overrides the CSS variables in `src/styles/tokens.css`; no component has brand-specific code.
- **Store switcher** is separate and lists the active brand's stores. Dashboard, reports, inventory, customers, expenses and settings are scoped to `brand:store`.
- **Brand Management** (`/settings/brands`): add, edit and delete brands, pick an industry preset, edit colours, font pairing, button / navigation / card style, upload a logo, manage stores, preview in the app, then save.
- **Permissions**: only the `Store Owner` role can manage brands (`src/branding/types.ts`). The role selector in the account menu is a demo stand-in for real authentication.
- **Persistence**: brands, active brand, active store per brand and role are saved in `localStorage` (`mobi-brands`). Store data is still in-memory sample data and resets on reload.

To add a preset or font pairing, append an entry to `brandPresets` or `fontPairings` in `src/branding/presets.ts`; default brands live in `src/branding/defaults.ts`. Brand fonts are loaded from Google Fonts on demand.

## Backend (optional, makes data persistent)

The app runs in two modes:

- **Demo mode** (default, `VITE_API_BASE_URL` empty): sample data in the browser, resets on reload. This is what GitHub Pages serves.
- **Live mode** (`VITE_API_BASE_URL` set at build time): products, stock, customers, sales, expenses, brands, marketplace orders and sync logs are stored by the API in `server/`, separately for each brand and store.

### Run locally

```
cd server
npm install
cp .env.example .env      # set ADMIN_KEY and CREDENTIALS_KEY
node --env-file=.env src/index.ts
```

Then start the frontend with `VITE_API_BASE_URL=http://localhost:4000 npm run dev`. Needs Node 22.18 or newer. With `DATABASE_URL` empty the API uses an embedded PostgreSQL-compatible database in `server/data`; with it set, it uses that PostgreSQL server.

### Deploy on Render

`render.yaml` defines the API (`mobi-api`) and a PostgreSQL database (`mobi-db`): Render → New → Blueprint → pick this repository. Afterwards set `CORS_ORIGINS` on `mobi-api` to the frontend address, and `VITE_API_BASE_URL` on the static site to the API address, then redeploy the static site.

### Marketplaces

Data comes from official seller APIs only; nothing is scraped. Until a marketplace is connected with valid credentials it shows as disconnected with no orders.

| Marketplace | Status |
| --- | --- |
| Amazon | SP-API: verifies the seller account and imports orders (last 30 days) |
| Flipkart | Marketplace Seller API: verifies the application and imports shipments/orders |
| Myntra, Nykaa, Meesho, Blinkit | Partner-only APIs; no connector until the marketplace grants access |

Credentials are entered under E-commerce → Platform Settings → API, checked against the marketplace, encrypted (AES-256-GCM, `CREDENTIALS_KEY`) and never sent back to the browser. Connecting, disconnecting and syncing require the `ADMIN_KEY`.

Not built yet: catalogue import, pushing listings, price and stock to marketplaces, user login. The admin key is the only access control, and the data endpoints are open to anyone who knows the API address.

Tests: `cd server && npm test` (marketplace calls are mocked).
