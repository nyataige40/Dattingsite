# Dattingsite — Premium Dating Platform

A premium dating web application with AI companion elements and a pay-to-unlock monetization model.

## Architecture

```
dattingsite/
├── assets/                   # Static site design system
│   ├── css/style.css         # Tokens, components, layouts, responsive, dark theme
│   └── js/
│       ├── data.js           # Mock partners, tiers, AI reply engine, interest lines
│       └── app.js            # LocalStorage store, session guards, navbar, theme, UI
├── index.html                # Landing page
├── login.html                # Sign in (+ social stubs, demo fill)
├── register.html             # Sign up (+ password strength meter)
├── onboarding.html           # 3-step profile setup
├── dashboard.html            # Matches, stats, interest notification popup
├── catalogue.html            # Tiered catalogue, unlock/payment flow
├── chat.html                 # Conversations with gender-swapped AI replies
├── profile.html              # Edit profile, interests, completion meter
├── transactions.html         # Wallet balance, spend by tier, receipts
├── backend/                  # Node.js + Express API
│   ├── src/
│   │   ├── config/           # Database config, schema, seed script
│   │   ├── controllers/      # API controllers (auth, profile, catalogue, chat, notification)
│   │   ├── middleware/       # Auth middleware (JWT verification)
│   │   ├── models/           # Data models with is_bot flags
│   │   ├── routes/           # Express route definitions
│   │   └── services/         # Auth, AI bot, notification, payment services
│   └── .env                  # Environment variables (create your own)
├── frontend/                 # React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/       # Reusable UI (Navbar, ProfileCard, Chat, Notifications, UnlockModal, Icons)
│   │   ├── pages/            # Page components (Login, Register, Onboarding, Dashboard, Catalogue, Chat, Profile, Transactions)
│   │   ├── context/          # React Context (Auth)
│   │   ├── services/         # API client (axios)
│   │   └── styles/           # Tailwind globals
│   └── vite.config.js        # Vite config with proxy to backend
├── database/
│   └── schema.sql            # PostgreSQL schema (production reference)
└── start.bat                 # Convenience start script (Windows)
```

## Two front ends

| Front end | Entry point | State | Backend |
|-----------|-------------|-------|---------|
| **Static site** | `http://localhost/Dattingsite/` via XAMPP/Apache | Browser LocalStorage (`dattingsite_v1`) | None — self-contained mock data |
| **React app** | `http://localhost:5173` via Vite | React context + axios | Express API on `:5000` |

The static site is the polished HTML/CSS/JS build. The React app is the API-connected build. They share the same feature set and tier model.

## Features

### 1. User Authentication & Profile Creation
- Email/password registration and login (bcrypt + JWT)
- Social login stubs (Google, Facebook)
- Onboarding flow: gender selection (Man/Woman), age, location, photo upload, interests selection

### 2. Dashboard & Interest Notifications
- Clean, modern dashboard showing potential matches
- Real-time interest notification popup on login (3 AI companion profiles "express interest")
- Notification center with bell icon

### 3. Tiered Partner Catalogue & Monetization
- Profiles categorized into Standard ($9.99), Premium ($29.99), Elite ($99.99) tiers
- Pay-to-unlock gate: photos, bios and chat stay blurred/locked behind an overlay
- Peek modal previews a locked profile before payment
- Wallet (balance-checked), Stripe and PayPal payment paths, with a top-up flow
- Blurred "unlock" state persists per partner; receipts recorded with a reference code

### 4. Gender-Swapped AI Chat Engine
- Messaging window with grouped bubbles, date dividers and quick replies
- Persona routing: Man → female companion, Woman → male companion
- Replies escalate through opener → warm → curious → close stages as the conversation deepens
- `is_bot` flag per partner and per message, so real members can replace bots seamlessly

### 5. Future-Proof Scalability
- All bot profiles and messages have `is_bot` flags
- Toggle `is_bot` to `false` to replace with real human profiles seamlessly

## Database Schema

All tables include `is_bot` flags:
| Table | is_bot Column | Purpose |
|-------|---------------|---------|
| profiles | Yes | Identifies AI companion vs real user |
| messages | Yes | Tracks bot-generated vs human messages |

## Running the Application

### Prerequisites
- Node.js v22+
- npm

### Quick Start

**Static site** (no build step, no backend)
1. Start XAMPP and make sure Apache is running.
2. Open `http://localhost/Dattingsite/`
3. Sign in with the demo account, or register and build a profile.

**React + API**
1. Run `start.bat` (Windows), or manually:
2. Backend: `cd backend && npm install && node src/app.js`
3. Frontend: `cd frontend && npm install && npx vite`

### Default Credentials

| Front end | Email | Password |
|-----------|-------|----------|
| Static site | `demo@premium.com` | `password123` |
| React app / API | `demo@example.com` | `password123` |

Static-site notes:
- State lives in LocalStorage under `dattingsite_v1`. `profile.html` → *Reset all local data* clears it.
- Passwords are hashed with a local djb2-style hash before being stored; there is no server.
- `?tier=Premium` on `catalogue.html` and `?with=<id>` on `chat.html` deep-link into filtered views.

## Tech Stack
- **Static site**: HTML5, CSS3 (custom properties, no framework), vanilla JavaScript (ES5-compatible, no build step)
- **Frontend**: React 18, Vite, Tailwind CSS
- **Backend**: Node.js, Express, SQLite (dev) / PostgreSQL (prod schema included)
- **Auth**: JWT + bcrypt (API); local hash + LocalStorage session (static site)
- **Database**: Relational (SQLite for dev, schema.sql for PostgreSQL)

## Static Site Pages

| Page | Purpose |
|------|---------|
| `index.html` | Marketing landing page, hero, tier pricing, FAQ |
| `login.html` | Sign in, social login stubs, demo-credential fill |
| `register.html` | Sign up with live password-strength meter and terms gate |
| `onboarding.html` | 3 steps: identity → photo → interests + bio |
| `dashboard.html` | Greeting, stat row, match grid, interest notification popup |
| `catalogue.html` | Tier filters, sorting, locked cards, unlock/payment modal |
| `chat.html` | Conversation list, message thread, AI replies, quick replies |
| `profile.html` | Profile editor, interest chips, completion meter, unlocked list |
| `transactions.html` | Wallet balance, spend by tier, filterable receipts |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login with email/password |
| POST | `/api/auth/social` | Social login (Google/Facebook stub) |
| GET | `/api/profile` | Get user profile |
| POST | `/api/profile` | Create profile (onboarding) |
| PUT | `/api/profile` | Update profile |
| GET | `/api/profile/matches` | Dashboard matches |
| GET | `/api/catalogue` | Tiered partner catalogue |
| POST | `/api/catalogue/unlock` | Unlock a partner (wallet/Stripe/PayPal) |
| POST | `/api/catalogue/add-funds` | Add wallet funds (Stripe/PayPal stub) |
| GET | `/api/catalogue/transactions` | Transaction history |
| GET | `/api/chat/conversation/:partnerId` | Get conversation |
| POST | `/api/chat/message/:partnerId` | Send message (triggers bot response) |
| GET | `/api/notifications` | Get + trigger interest notifications |
| PUT | `/api/notifications/read` | Mark all as read |
