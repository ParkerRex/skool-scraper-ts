# SKOOL Community Scraper

A TypeScript-based scraper for extracting data from your SKOOL community using Playwright and SQLite.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   ```

3. **Choose authentication method:**

   ### Option A: Use Existing Chrome Session (Recommended)
   
   This method uses your existing Chrome browser with all your logins intact.
   
   a. **Quit Chrome completely**
   
   b. **Relaunch Chrome with remote debugging:**
   ```bash
   # On macOS:
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
   
   # On Windows:
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
   
   # On Linux:
   google-chrome --remote-debugging-port=9222
   ```
   
   c. **Log into SKOOL** in the Chrome window that opens
   
   d. **Set in `.env`:**
   ```
   USE_EXISTING_CHROME=true
   ```

   ### Option B: Cookie Authentication
   
   If you prefer not to use your existing Chrome:
   
   a. **Get your SKOOL cookie:**
   - Log into SKOOL in any browser
   - Open Developer Tools (F12)
   - Go to Application/Storage → Cookies
   - Find and copy the `auth_token` cookie value
   
   b. **Set in `.env`:**
   ```
   SKOOL_COOKIE=auth_token=your_token_here
   USE_EXISTING_CHROME=false
   ```

4. **Run the scraper:**
   ```bash
   npm start https://www.skool.com/your-community-name
   ```

## Features

- ✅ Cookie-based authentication
- ✅ Members scraping with pagination
- ✅ SQLite database storage
- ✅ JSON backup files
- ✅ Progress tracking and resumption
- ✅ Rate limiting
- 🔄 Threads scraping (TODO)
- 🔄 Posts/Comments scraping (TODO)
- 🔄 Likes tracking (TODO)

## Data Storage

- **SQLite Database:** `./db/skool.db`
- **JSON Backups:** `./data/`

## Database Management

View your data with Drizzle Studio:
```bash
npm run db:studio
```

## Development

Run with debug logging:
```bash
npm run dev https://www.skool.com/your-community-name
```

Run in headed mode (see browser):
```bash
HEADLESS=false npm start https://www.skool.com/your-community-name
```

## Migration to PostgreSQL

The SQLite schema is designed to be easily portable to PostgreSQL. When ready:
1. Export data from SQLite
2. Update Drizzle schema for PostgreSQL
3. Run migrations
4. Import data