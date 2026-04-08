# Design Guidelines: Inventory Management SaaS Platform

## Design Approach
**System-Based Approach**: Material Design-inspired with modern SaaS dashboard patterns (Linear, Notion, Airtable)

**Justification**: This is a utility-focused, information-dense productivity application where data clarity, workflow efficiency, and consistent patterns are paramount. Material Design provides excellent data visualization components, table systems, and form patterns perfect for inventory management.

---

## Core Design Elements

### A. Typography
**Font Family**: Inter (Google Fonts)
- Primary font for entire application
- Excellent readability at small sizes (critical for data tables)
- Professional, modern aesthetic

**Hierarchy**:
- Page Titles: text-3xl, font-semibold (Dashboard, Hardware Total, Stock)
- Section Headers: text-xl, font-semibold (Analytics, Client List)
- Card Titles: text-lg, font-medium
- Table Headers: text-sm, font-medium, uppercase, tracking-wide
- Body Text: text-base, font-normal
- Table Data: text-sm, font-normal
- Labels/Captions: text-xs, font-medium
- Buttons: text-sm, font-medium

---

### B. Layout System

**Spacing Primitives**: Tailwind units of 2, 4, 6, and 8
- Tight spacing (p-2, gap-2): Table cells, compact elements
- Standard spacing (p-4, gap-4): Card padding, form fields
- Medium spacing (p-6, gap-6): Section padding, modal content
- Large spacing (p-8, gap-8): Page margins, major section separation

**Grid System**:
- Main container: max-w-7xl mx-auto px-4 md:px-6 lg:px-8
- Dashboard cards: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4
- Table layouts: Full-width responsive containers
- Form sections: Two-column layouts on desktop (grid-cols-1 lg:grid-cols-2)

---

### C. Component Library

#### Navigation
**Sidebar Navigation** (Persistent):
- Fixed left sidebar (w-64) with company logo at top
- Navigation items: Dashboard, Hardware Total, Stock, Clients, Analytics, Settings
- Active state with subtle left border accent
- Icon + label for each nav item (Heroicons)
- User profile section at bottom with avatar and name

**Top Bar**:
- Search functionality (global search across products/clients)
- User menu with dropdown (profile, settings, logout)
- Notifications bell icon
- Breadcrumb navigation showing current location

#### Dashboard Cards (Analytics)
**Stat Cards** (4-column grid on desktop):
- Large number display (text-3xl, font-bold)
- Label below (text-sm, font-medium)
- Small trend indicator with arrow icon
- Percentage change (text-xs)
- Minimal card with subtle border, rounded-lg

**Chart Cards**:
- Card header with title and action menu (filter, export)
- Chart area using responsive height
- Legend below chart
- Utilize libraries like Chart.js or Recharts
- Types: Line charts (trends), Bar charts (comparisons), Donut charts (distribution)

#### Data Tables
**Table Structure**:
- Sticky header row (position-sticky top-0)
- Zebra striping for rows (even:bg-gray-50 pattern)
- Hover states on rows
- Sortable columns with arrow indicators
- Action column (right-aligned) with icon buttons
- Checkbox column for bulk actions
- Pagination at bottom (showing "1-50 of 234 items")

**Table Columns** (for Hardware/Stock):
- Checkbox (fixed-width: w-12)
- Product Code (w-32, monospace font)
- Product Name (flex-1, truncate with tooltip)
- Quantity (w-24, right-aligned)
- Purchase Price (w-32, right-aligned)
- Sell Price (w-32, right-aligned)
- Total Cost (w-32, right-aligned, font-medium)
- Actions (w-24, icon buttons)

#### Forms
**Input Fields**:
- Floating labels or top labels (text-sm, font-medium, mb-1)
- Input styling: border rounded-md px-3 py-2, focus ring
- Required field indicator (red asterisk)
- Help text below input (text-xs)
- Error states with red border and error message

**Form Layout**:
- Modal dialogs for add/edit operations (max-w-2xl)
- Grouped fields with section headers
- Two-column layout for related fields (Product Code + Name)
- Full-width for text areas
- Action buttons right-aligned (Cancel + Save)

#### Modals
**Structure**:
- Overlay backdrop (bg-black/50)
- Centered modal with max-width constraints
- Modal header with title and close button (×)
- Scrollable content area
- Sticky footer with actions

**Usage**:
- Add New Hardware
- Edit Product Details
- Assign Hardware to Client
- View Movement History
- Confirm Delete Actions

#### Buttons
**Primary Button**: 
- Solid fill, medium weight font
- px-4 py-2, rounded-md
- Used for main actions (Save, Add, Submit)

**Secondary Button**:
- Outline style with border
- Same sizing as primary
- Used for Cancel, Back

**Icon Buttons**:
- Small circular or square (w-8 h-8)
- Used in tables and headers
- Edit, Delete, View icons

**Action Button Groups**:
- Bulk actions toolbar above tables
- Export, Import, Filter options

#### Client Management
**Client Cards** (Grid View Option):
- grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Card shows: Client name, assigned hardware count, total value
- Quick actions: View Details, Edit, Remove Hardware

**Client Detail View**:
- Split layout: Client info sidebar (w-80) + Hardware table (flex-1)
- Client info: Name, contact, address, date added
- Assigned hardware table with ability to remove items

#### Stock Movement History
**Timeline View**:
- Vertical timeline with entries
- Each entry: Date/time, action type (badge), user, item details
- Filter by date range, action type, user
- Search functionality

---

### D. Additional UI Elements

**Badges/Status Indicators**:
- Stock status: In Stock (green), Low Stock (yellow), Out of Stock (red)
- Movement type: Purchase (blue), Assignment (purple), Return (gray)
- Pill-shaped, px-2 py-1, text-xs

**Empty States**:
- Centered icon + message
- Call-to-action button below
- Used when no data exists (no clients, no stock movements)

**Loading States**:
- Skeleton screens for tables and cards
- Spinner for button actions
- Progress bar for imports/exports

**Tabs** (Secondary Navigation):
- Used within pages (e.g., Analytics: Overview, By Client, By Product)
- Underline active tab style
- Horizontal scrolling on mobile

---

### E. Responsive Behavior

**Desktop (lg+)**:
- Sidebar visible, full multi-column layouts
- Tables show all columns

**Tablet (md)**:
- Sidebar collapses to icons only or hamburger menu
- 2-column grids reduce to 2 columns
- Some table columns hide

**Mobile (base)**:
- Full hamburger menu
- All grids stack to single column
- Tables convert to card-based mobile view
- Horizontal scroll for essential table data

---

### F. Key Page Layouts

**Dashboard Page**:
- 4 stat cards at top
- 2x2 grid of chart cards below
- Recent movements table at bottom

**Hardware Total Page**:
- Search and filter toolbar
- Add New Hardware button (top-right)
- Full-width data table
- Pagination controls

**Stock Page**:
- Similar to Hardware Total
- Additional stock level filters (In Stock, Low, Out)
- Visual stock level indicators

**Client Detail Page**:
- Two-column layout (client info + hardware list)
- Actions: Add Hardware, Edit Client, Remove Client
- Hardware assignment interface with search

---

## Images
No images required for this dashboard application. Focus is on data, tables, charts, and functional UI components.

---

## Special Considerations
- Emphasize data clarity: generous cell padding, clear typography hierarchy
- Quick actions everywhere: hover menus, inline editing where appropriate
- Real-time updates: show unsaved changes indicators
- Keyboard shortcuts support: announce with ? key overlay
- Export functionality prominent: Excel/CSV export buttons on all data tables