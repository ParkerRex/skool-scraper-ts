import { chromium } from 'playwright';
import { config } from 'dotenv';
import { initializeDatabase } from './db/client';
import { SkoolAuth } from './scrapers/auth';
import { MembersScraper } from './scrapers/members';
import { Logger } from './utils/logger';

// Load environment variables
config();

const logger = new Logger('Main');

async function main() {
  // Validate environment variables
  if (!process.env.SKOOL_COOKIE) {
    logger.error('SKOOL_COOKIE environment variable is required');
    logger.info('Please copy your SKOOL session cookie from browser developer tools');
    logger.info('and add it to .env file as SKOOL_COOKIE=your_cookie_here');
    process.exit(1);
  }

  const communityUrl = process.argv[2];
  if (!communityUrl || !communityUrl.includes('skool.com')) {
    logger.error('Please provide your SKOOL community URL as an argument');
    logger.info('Usage: npm start https://www.skool.com/your-community-name');
    process.exit(1);
  }

  // Initialize database
  logger.info('Initializing database...');
  initializeDatabase();

  // Create browser instance
  let browser;
  
  if (process.env.USE_EXISTING_CHROME === 'true') {
    // Connect to existing Chrome instance
    logger.info('Connecting to existing Chrome instance...');
    logger.info('Make sure Chrome is running with remote debugging:');
    logger.info('On Mac: /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222');
    
    try {
      browser = await chromium.connectOverCDP('http://localhost:9222');
      logger.info('Connected to existing Chrome instance');
    } catch (error) {
      logger.error('Failed to connect to Chrome. Make sure Chrome is running with --remote-debugging-port=9222');
      process.exit(1);
    }
  } else {
    // Launch new browser with stealth settings
    browser = await chromium.launch({
      headless: process.env.HEADLESS !== 'false',
      slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    });
  }

  try {
    // Initialize authentication
    const auth = new SkoolAuth(process.env.SKOOL_COOKIE);

    // Start scraping process
    logger.info(`Starting scrape for community: ${communityUrl}`);

    // 1. Scrape members
    logger.info('Starting members scrape...');
    const membersScraper = new MembersScraper(auth, communityUrl);
    await membersScraper.initialize(browser);
    await membersScraper.scrape();
    await membersScraper.cleanup();

    // TODO: Add more scrapers here
    // 2. Scrape threads
    // 3. Scrape posts and comments
    // 4. Scrape likes

    logger.info('Scraping completed successfully!');

  } catch (error) {
    logger.error('Scraping failed', error);
    process.exit(1);
  } finally {
    // Don't close browser when using existing Chrome
    if (process.env.USE_EXISTING_CHROME !== 'true') {
      await browser.close();
    }
  }
}

// Run the scraper
main().catch((error) => {
  logger.error('Unhandled error', error);
  process.exit(1);
});