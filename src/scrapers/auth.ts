import { Browser, BrowserContext, Page } from 'playwright';
import { Logger } from '../utils/logger';

export class SkoolAuth {
  private logger = new Logger('SkoolAuth');
  private cookie: string;
  private baseUrl: string;

  constructor(cookie: string, baseUrl: string = 'https://www.skool.com') {
    this.cookie = cookie;
    this.baseUrl = baseUrl;
  }

  async createAuthenticatedContext(browser: Browser): Promise<BrowserContext> {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      // Additional headers to appear more like a real browser
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      // Preserve browser context
      locale: 'en-US',
      timezoneId: 'America/New_York',
    });

    // Parse and set cookies
    await this.setCookies(context);
    
    return context;
  }

  private async setCookies(context: BrowserContext) {
    try {
      // Cookie format: "name=value; name2=value2"
      const cookiePairs = this.cookie.split(';').map(c => c.trim());
      const cookies = [];

      for (const pair of cookiePairs) {
        const [name, ...valueParts] = pair.split('=');
        const value = valueParts.join('='); // Handle values with = in them
        
        if (name && value) {
          cookies.push({
            name: name.trim(),
            value: value.trim(),
            domain: '.skool.com',
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'Lax' as const,
          });
        }
      }

      await context.addCookies(cookies);
      this.logger.info(`Set ${cookies.length} cookies for authentication`);
    } catch (error) {
      this.logger.error('Failed to set cookies', error);
      throw error;
    }
  }

  async verifyAuthentication(page: Page, communityUrl?: string): Promise<boolean> {
    try {
      // Go directly to the community URL if provided
      const url = communityUrl || this.baseUrl;
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      
      // Wait a bit for page to settle
      await page.waitForTimeout(2000);
      
      // Check multiple possible indicators of being logged in
      const selectors = [
        '[data-testid="user-menu"]',
        '[aria-label="User menu"]',
        '.user-avatar',
        'img[alt*="avatar"]',
        'button[aria-label*="profile"]',
        'a[href*="/settings"]',
        '.member-avatar',
        '[class*="avatar"]'
      ];
      
      for (const selector of selectors) {
        const count = await page.locator(selector).count();
        if (count > 0) {
          this.logger.info(`Authentication verified successfully using selector: ${selector}`);
          return true;
        }
      }
      
      // Also check if we can access members page
      const membersUrl = `${communityUrl}/members`;
      await page.goto(membersUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      // If we see member cards, we're likely authenticated
      const hasMemberContent = await page.locator('[class*="member"], [data-testid*="member"]').count() > 0;
      
      if (hasMemberContent) {
        this.logger.info('Authentication verified via members page access');
        return true;
      }
      
      this.logger.warn('Authentication check failed - may need to update cookie');
      return false;
    } catch (error) {
      this.logger.error('Error verifying authentication', error);
      return false;
    }
  }
}