import { Browser, BrowserContext, Page } from 'playwright';
import { db } from '../db/client';
import { scrapeProgress } from '../db/schema';
import { eq } from 'drizzle-orm';
import { Logger } from '../utils/logger';
import { delay, getRandomDelay } from '../utils/delay';
import { SkoolAuth } from './auth';

export abstract class BaseScraper {
  protected browser: Browser | null = null;
  protected context: BrowserContext | null = null;
  protected page: Page | null = null;
  protected logger: Logger;
  protected auth: SkoolAuth;
  protected taskType: string;

  constructor(auth: SkoolAuth, taskType: string) {
    this.auth = auth;
    this.taskType = taskType;
    this.logger = new Logger(this.constructor.name);
  }

  async initialize(browser: Browser) {
    this.browser = browser;
    
    // If using existing Chrome, use the default context
    if (process.env.USE_EXISTING_CHROME === 'true') {
      this.logger.info('Using existing Chrome context');
      const contexts = browser.contexts();
      if (contexts.length > 0) {
        this.context = contexts[0];
        // Use existing page or create new one
        const pages = this.context.pages();
        if (pages.length > 0) {
          this.page = pages[0];
        } else {
          this.page = await this.context.newPage();
        }
      } else {
        throw new Error('No browser contexts found in existing Chrome');
      }
    } else {
      // Create new authenticated context
      this.context = await this.auth.createAuthenticatedContext(browser);
      this.page = await this.context.newPage();
    }

    // Set up request interception to log API calls
    this.page.on('response', (response) => {
      if (response.url().includes('/api/') && response.status() === 200) {
        this.logger.debug(`API Response: ${response.url()}`);
      }
    });

    this.logger.info('Browser initialized successfully');
  }

  async cleanup() {
    // Don't close pages/contexts when using existing Chrome
    if (process.env.USE_EXISTING_CHROME !== 'true') {
      if (this.page) await this.page.close();
      if (this.context) await this.context.close();
    }
  }

  protected async getOrCreateProgress() {
    const existing = await db
      .select()
      .from(scrapeProgress)
      .where(eq(scrapeProgress.taskType, this.taskType))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    const [newProgress] = await db
      .insert(scrapeProgress)
      .values({
        taskType: this.taskType,
        status: 'pending',
        totalProcessed: 0,
      })
      .returning();

    return newProgress;
  }

  protected async updateProgress(updates: {
    lastProcessedId?: string;
    lastProcessedPage?: number;
    totalProcessed?: number;
    status?: 'pending' | 'in_progress' | 'completed' | 'failed';
    error?: string;
  }) {
    const progress = await this.getOrCreateProgress();
    
    await db
      .update(scrapeProgress)
      .set({
        ...updates,
        ...(updates.status === 'in_progress' && !progress.startedAt
          ? { startedAt: new Date() }
          : {}),
        ...(updates.status === 'completed' ? { completedAt: new Date() } : {}),
      })
      .where(eq(scrapeProgress.id, progress.id));
  }

  protected async waitForSelector(selector: string, timeout: number = 30000) {
    try {
      await this.page!.waitForSelector(selector, { timeout });
      return true;
    } catch (error) {
      this.logger.warn(`Selector not found: ${selector}`);
      return false;
    }
  }

  protected async scrollToBottom() {
    if (!this.page) return;
    
    await this.page.evaluate(() => {
      return new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
  }

  protected async rateLimitDelay() {
    const delayMs = process.env.SCRAPE_DELAY 
      ? parseInt(process.env.SCRAPE_DELAY) 
      : getRandomDelay(1000, 2000);
    
    await delay(delayMs);
  }

  abstract scrape(): Promise<void>;
}