# NYC Arrest Data Visualization and Analysis System

A full-stack web application that transforms raw NYPD arrest data into an interactive analytics platform. Users can explore arrest patterns across time, geography, and demographics through data visualizations, advanced filtering, and statistical dashboards.

**Live Demo: http://13.58.41.101
**Tech Stack**: Node.js · Express.js · MongoDB · Handlebars · Chart.js

---

## Table of Contents

- [Project Overview](#project-overview)
- [System Architecture](#system-architecture)
- [Database Design](#database-design)
- [Features](#features)
- [API Routes](#api-routes)
- [Security Implementation](#security-implementation)
- [Data Pipeline](#data-pipeline)
- [Installation & Setup](#installation--setup)
- [Known Limitations & Future Improvements](#known-limitations--future-improvements)

---

## Project Overview

The NYPD publishes detailed public records of all arrests made throughout New York City. While this data is publicly accessible, it exists as raw CSV exports that are difficult for most people to interpret. This project bridges that gap by providing an interactive platform where citizens, researchers, and policymakers can explore arrest trends without any data science background.

### Why This Project Matters

- **Civic transparency**: Makes law enforcement data accessible to the public
- **Pattern discovery**: Reveals trends across boroughs, demographics, and time periods
- **Data literacy**: Turns 212,000+ raw records into readable charts and filterable tables

### Core Design Decisions

**Server-Side Rendering with Handlebars**: Chosen over a SPA framework because the dataset is read-heavy and SEO-friendliness matters for a public-facing civic tool. The server pre-renders pages with data already embedded, reducing client-side JavaScript complexity.

**Stratified Sampling**: Rather than loading all 212,486 records into the database, we sample 400 records per borough (2,000 total). This ensures geographic representativeness while keeping query performance fast for a development environment.

**MongoDB**: The NYPD dataset has some inconsistent fields and null values across records. A document-oriented database tolerates this schema flexibility better than a rigid relational schema during the exploratory phase.

---

## System Architecture

```
Browser → Middleware → Routes → Data Layer → MongoDB
                    ↘ Views → Browser
```

### Layer Responsibilities

**`app.js`** — Application entry point. Configures Express, registers all middleware in the correct order, sets up Handlebars as the view engine with custom helpers, and starts the HTTP server on port 3000.

**`middleware/`** — Three cross-cutting concerns:
- `logger.js`: Logs every incoming request (method, path, timestamp) for debugging
- `auth.js`: `requireAuth` blocks unauthenticated access to protected routes; `attachUser` injects the session user into every Handlebars template via `res.locals`
- `errorHandler.js`: Centralized error formatting so no raw stack traces leak to the client

**`routes/`** — Thin HTTP layer. Each route file handles request parsing, input sanitization (XSS), and delegates business logic entirely to the data layer. Routes never query the database directly.

**`data/`** — Business logic and database operations. Each file maps to a feature domain. All validation lives here via `utils.js` helpers. This separation means the same data functions could be reused by a REST API or CLI tool without touching routes.

**`views/`** — Handlebars templates. A single `layouts/main.handlebars` wraps all pages with the navbar and footer. Page-specific templates receive pre-rendered data from the server — no client-side data fetching required for core content.

**`config/`** — MongoDB connection pooling and collection accessors. The connection is established once and reused across requests.

---

## Database Design

### Collections Overview

The application uses four MongoDB collections:

```
arrests        ~2,000 documents  (core dataset)
users          variable          (registered accounts)
comments       variable          (user-generated content)
referenceData  7 documents       (static lookup tables)
```

### `arrests` Collection

The primary dataset. Each document represents one arrest event sampled from the NYPD open data portal.

```json
{
  "_id": "ObjectId",
  "arrest_date": "2024-10-12",
  "borough": "M",
  "precinct": 14,
  "offense_description": "DANGEROUS WEAPONS",
  "law_category": "misdemeanor",
  "age_group": "25-44",
  "gender": "M",
  "race": "WHITE HISPANIC",
  "arrest_location": {
    "latitude": 40.758896,
    "longitude": -73.985130
  }
}
```

**Design notes**:
- `borough` stores the single-character NYPD code (`B`, `S`, `K`, `M`, `Q`) rather than the full name, matching the source dataset format
- `law_category` is normalized to lowercase (`felony`, `misdemeanor`, `violation`) for consistent querying
- `arrest_location` is a subdocument to keep geographic data co-located and allow future GeoJSON indexing

### `users` Collection

Stores account credentials and user preferences.

```json
{
  "_id": "ObjectId",
  "username": "johndoe",
  "email": "john@example.com",
  "password": "$2a$10$...",
  "favorites": ["arrestId1", "arrestId2"],
  "comments": ["commentId1"],
  "createdAt": "2025-11-09T03:00:00Z"
}
```

**Design notes**:
- Passwords are never stored in plaintext — only bcrypt hashes with 10 salt rounds
- `favorites` is a simple array of arrest ID strings; for the scale of this application an embedded array outperforms a separate join collection
- `password` is deleted from the object before any user document is returned to the application layer

### `comments` Collection

Links users to arrest records via foreign key references.

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "arrestId": "ObjectId",
  "text": "Arrests in Brooklyn have increased this week.",
  "createdAt": "2025-11-09T04:30:00Z",
  "updatedAt": "2025-11-09T04:30:00Z"
}
```

**Design notes**:
- Both `userId` and `arrestId` are stored as `ObjectId` (not strings) to support future `$lookup` aggregation queries
- Sorted by `createdAt: -1` on retrieval so newest comments appear first
- Delete operations use a compound filter `{ _id, userId }` so users can only delete their own comments — the ownership check happens at the database level, not just the application level

### `referenceData` Collection

Caches small static lookup tables (borough names, offense code mappings) that feed dropdown menus and validation. These never change during a session and are loaded once at startup to avoid repeated queries.

---

## Features

### 1. Arrest Record Browsing with Pagination

`GET /arrests?page=N`

Fetches 50 records per page using MongoDB's `.skip()` and `.limit()`. The server calculates `totalPages`, `hasNextPage`, and `hasPrevPage` and passes them to the template, which renders numbered page controls. Requesting a page beyond the total redirects to the last valid page.

**Interview talking point**: Pagination at the database level (skip/limit) is more efficient than fetching all records and slicing in JavaScript — only the needed 50 documents are transferred from MongoDB to the application.

### 2. Search

`GET /arrests/search?keyword=assault`

Uses MongoDB's `$regex` operator with case-insensitive flag (`$options: "i"`) to search across `offense_description` and `law_category` fields simultaneously via a `$or` query. All user input is sanitized with the `xss` library before being passed to the query.

### 3. Advanced Filtering

`GET /arrests/filter?borough=M&law_category=felony&age_group=25-44`

Dynamically builds a MongoDB query object from whichever filter parameters are present. Fields not included in the request are simply omitted from the query — MongoDB treats a missing field as "match all". This avoids complex conditional branching.

### 4. Statistical Dashboard

`GET /stats`

Aggregates key metrics using MongoDB aggregation pipelines: total arrest count, breakdown by borough, top offense categories, and law category distribution. Results are passed to Chart.js on the frontend for bar and pie chart rendering.

### 5. Demographic Insights

`GET /demographics`

Loads all arrest records and computes six cross-dimensional breakdowns in a single pass through the dataset:
- Age group distribution
- Gender distribution  
- Race distribution
- Age group × borough (grouped bar chart)
- Age group × gender
- Race × borough

Processing in a single loop avoids making six separate database queries.

### 6. Time-Series Trends

`GET /trends`

Groups arrest records by week or month using MongoDB's date aggregation operators. The result is a chronological series that Chart.js renders as a line chart, making temporal patterns visible.

### 7. Crime Category Ranking

`GET /arrests/ranking`

Uses a two-stage MongoDB aggregation pipeline: first groups by `{offense_description, law_category}` to count occurrences, then groups again by offense name to consolidate variants. Sorted descending and limited to the top 10. Percentage of total is computed server-side.

### 8. User Authentication

- **Registration** (`POST /users/register`): Validates all fields, checks for duplicate username/email, hashes password with bcrypt, creates session
- **Login** (`POST /users/login`): Looks up user by username, compares password hash, returns generic error message on failure to prevent username enumeration
- **Logout** (`GET /users/logout`): Calls `req.session.destroy()` and redirects

### 9. Comments

Registered users can add comments to individual arrest records. Comments are tied to both a `userId` and `arrestId`. Users can delete their own comments. The ownership check is enforced at the database query level using a compound filter.

### 10. Data Export

Filtered results can be exported as:
- **CSV**: Server generates a comma-separated string with proper headers and streams it as a file download
- **PDF**: Uses `pdf-lib` to programmatically construct a formatted PDF document with filter criteria summary and paginated results

### Extra Features

- **Dark/Light Mode**: User's theme preference is stored in `localStorage` and applied on page load via a CSS class toggle on `<body>`. The toggle state persists across sessions.
- **Help & FAQ Page**: Static page explaining all features and common questions

---

## API Routes

| Method | Path | Auth Required | Description |
|--------|------|:---:|-------------|
| GET | `/` | No | Home page |
| GET | `/arrests` | No | Paginated arrest list |
| GET | `/arrests/search` | No | Keyword search |
| GET | `/arrests/filter` | No | Multi-field filter |
| GET | `/arrests/ranking` | No | Top 10 crime categories |
| GET | `/arrests/filter/export/csv` | No | Export filtered results as CSV |
| GET | `/arrests/filter/export/pdf` | No | Export filtered results as PDF |
| GET | `/arrests/:id` | No | Single arrest detail |
| GET | `/arrests/:id/comments` | No | Comments for an arrest |
| GET | `/demographics` | No | Demographic breakdown charts |
| GET | `/stats` | No | Statistical dashboard |
| GET | `/trends` | No | Time-series trends |
| GET | `/help` | No | Help & FAQ |
| GET | `/users/register` | Guest only | Registration form |
| POST | `/users/register` | Guest only | Create account |
| GET | `/users/login` | Guest only | Login form |
| POST | `/users/login` | Guest only | Authenticate user |
| GET | `/users/logout` | Yes | Destroy session |
| GET | `/users/profile` | Yes | User profile & comments |
| POST | `/users/add-favorite` | Yes | Save arrest to favorites |
| POST | `/users/remove-favorite` | Yes | Remove from favorites |
| GET | `/comments` | Yes | Post a comment |
| DELETE | `/comments/:id` | Yes | Delete own comment |

---

## Security Implementation

### Input Validation (Three Layers)

Every user input goes through three independent validation checkpoints:

1. **Client-side**: HTML5 `required` attributes and pattern validation for immediate feedback
2. **Route-level**: XSS sanitization using the `xss` library before any processing
3. **Data-layer**: Type checking, format validation, and business rule enforcement in `utils.js`

### Password Requirements

Enforced in `data/utils.js` `validatePassword()`:
- Minimum 8 characters
- At least one uppercase letter (`/[A-Z]/`)
- At least one lowercase letter (`/[a-z]/`)
- At least one digit (`/[0-9]/`)
- At least one special character

### Username Requirements

Enforced in `validateUsername()`:
- 3–20 characters
- Only letters, numbers, and underscores (`/^[a-zA-Z0-9_]+$/`)
- Cannot be entirely numeric
- Stored and compared in lowercase for case-insensitive uniqueness

### Email Validation

Two-stage check:
1. Format validation via regex
2. Rejects known disposable/invalid TLD patterns (e.g. `.bob`)

### Authentication Security

- Passwords hashed with **bcrypt** (10 salt rounds) — computationally expensive by design to slow brute-force attacks
- Login errors always return **"Invalid username or password"** regardless of whether the username or password was wrong — prevents username enumeration attacks
- Sessions use **HTTP-only cookies** — inaccessible to client-side JavaScript, preventing XSS-based session theft
- Protected routes use `requireAuth` middleware — unauthenticated requests are redirected before any data is accessed

### XSS Protection

All user-supplied strings (search terms, filter values, comment text, form fields) are passed through the `xss` library which strips or escapes potentially dangerous HTML tags and attributes.

---

## Data Pipeline

### Current Implementation (One-time Seed)

```
NYPD Open Data API (212,486 records)
  → Stratified sampling (400 × 5 boroughs = 2,000 records)
  → Data cleaning (normalize codes, dates, null handling)
  → Insert into MongoDB (arrests · test users · sample comments)
```

**Why not query the NYPD API directly on every user request?**
Direct API calls on each request would introduce unpredictable latency, expose the application to third-party rate limits, and prevent us from adding indexes, caching, or custom fields. By owning our own database, we control performance, uptime, and schema.

**Why stratified sampling?** A simple random sample of 2,000 records from 212,000 would likely over-represent the most common boroughs (Manhattan, Brooklyn) and under-represent Staten Island. Stratified sampling guarantees each borough has equal representation, making demographic and geographic comparisons meaningful.

### Production-Ready Design (Planned)

In a production environment the one-time seed would be replaced by a scheduled sync job:

```
Cron job (nightly 3:00 AM)
  → Fetch NYPD API records newer than last_sync timestamp
  → Clean & normalize (same pipeline as seed)
  → Upsert into MongoDB
  → Update last_sync timestamp → repeat
```

This incremental sync approach only fetches records added since the last run, keeping the database current without re-importing the entire dataset each night.

---

## Installation & Setup

### Prerequisites

- Node.js v18 or higher
- MongoDB v6 or higher
- npm

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/wenhuigao117/NYPD-Arrest-Data-Visualisation-and-Analysis-System.git
cd NYPD-Arrest-Data-Visualisation-and-Analysis-System

# 2. Install dependencies
npm install

# 3. Start MongoDB (macOS with Homebrew)
brew services start mongodb-community

# 4. Seed the database (fetches live data from NYC Open Data API)
npm run seed

# 5. Start the server
npm start

# 6. Open in browser
open http://localhost:3000
```

### Test Accounts

| Username | Password | Role |
|----------|----------|------|
| `testuser` | `Password123@` | Standard user |
| `admin` | `Admin123&` | Standard user |

---

## Known Limitations & Future Improvements

### Current Limitations

- **Dataset size**: 2,000 sampled records represent the full dataset of 212,000+ arrests. Statistical conclusions should be interpreted with this sampling in mind.
- **Static dataset**: The database is seeded once manually. New NYPD arrests published after the seed date are not reflected until the seed script is re-run. A scheduled sync job would be required for production use.
- **Session storage**: Sessions are stored in memory. In a production environment with multiple server instances, a shared session store (e.g. Redis) would be required.
- **No map visualization**: Latitude/longitude coordinates are stored but not yet rendered on an interactive map.
- **No database indexes**: High-frequency query fields (`borough`, `arrest_date`, `offense_description`) are not indexed. At 2,000 records this is unnoticeable, but would become a bottleneck at scale.

### Planned Improvements

- **Scheduled data sync**: Replace the one-time seed with a nightly cron job that incrementally fetches new records from the NYPD API using date-range filtering, keeping the dataset current without full re-imports
- Migrate to **React + Next.js** frontend for richer interactivity
- Replace MongoDB with **PostgreSQL** — the arrest dataset is highly structured and relational queries (joins between arrests, comments, users) would benefit from SQL
- Replace session auth with **JWT** for stateless, horizontally scalable authentication
- Add **interactive map** using Leaflet.js or Mapbox to plot arrest locations geographically
- Implement **sorting** on the browse and search pages (by date, borough, offense type)
- Add **database indexes** on high-frequency filter fields for query performance at scale
- Deploy to **AWS** (RDS + Elastic Beanstalk + Amplify)

---

## Project Structure

```
.
├── app.js                    # Express server entry point
├── package.json
│
├── config/
│   ├── mongoConnection.js    # Database connection (singleton pattern)
│   ├── mongoCollections.js   # Collection accessor functions
│   └── settings.js           # App-wide constants
│
├── data/                     # Business logic & DB operations
│   ├── arrests.js            # CRUD + aggregation for arrest records
│   ├── users.js              # User management & authentication
│   ├── comments.js           # Comment CRUD with ownership checks
│   ├── trends.js             # Time-series aggregation queries
│   ├── referenceData.js      # Static lookup data
│   ├── utils.js              # Shared validation helpers
│   └── index.js              # Data layer exports
│
├── middleware/
│   ├── auth.js               # requireAuth, requireGuest, attachUser
│   ├── logger.js             # Request logging
│   └── errorHandler.js       # Centralized error responses
│
├── routes/
│   ├── index.js              # Route registration & home route
│   ├── arrests.js            # Browse, search, filter, export
│   ├── users.js              # Auth, profile, favorites
│   ├── comments.js           # Comment CRUD
│   ├── stats.js              # Dashboard aggregations
│   ├── trends.js             # Time-series routes
│   ├── help.js               # FAQ page
│   └── errors.js             # Error page routes
│
├── views/
│   ├── layouts/main.handlebars   # Base layout (navbar + footer)
│   ├── partials/                 # Reusable template fragments
│   ├── home.handlebars
│   ├── arrestList.handlebars
│   ├── arrestDetails.handlebars
│   ├── search.handlebars
│   ├── filter.handlebars
│   ├── stats.handlebars
│   ├── trends.handlebars
│   ├── demographicInsights.handlebars
│   ├── crimeRanking.handlebars
│   ├── login.handlebars
│   ├── register.handlebars
│   ├── userProfile.handlebars
│   ├── userComments.handlebars
│   ├── help.handlebars
│   └── error.handlebars
│
├── public/
│   ├── css/styles.css
│   └── js/                   # Client-side JS (Chart.js init, theme toggle, etc.)
│
└── tasks/
    └── seed.js               # Data pipeline: fetch → sample → clean → insert
```

---

---

## Cloud Deployment

### Production Stack

| Component | Service | Details |
|-----------|---------|---------|
| Server | AWS EC2 t3.micro | Ubuntu 26.04 LTS, us-east-2 |
| Database | MongoDB Atlas M0 | Free tier, AWS us-east-1 |
| Process Manager | PM2 | Auto-restart, boot persistence via systemd |
| Reverse Proxy | Nginx 1.28 | Port 80 -> 3000, proxy headers |

**Live Demo**: http://13.58.41.101

### Architecture
### Key Linux Commands

```bash
ssh -i nyc-arrest-key.pem ubuntu@13.58.41.101
pm2 status && pm2 logs nyc-arrest
git pull origin main && pm2 restart nyc-arrest
sudo systemctl restart nginx
```

### Design Decisions

**PM2**: Process resurrection on crash, log rotation, systemd boot persistence.

**Nginx reverse proxy**: Decouples HTTP layer from app. Extensible with SSL and rate limiting without touching application code.

**MongoDB Atlas**: Managed database offloads backups and failover. App only needs a connection string.
