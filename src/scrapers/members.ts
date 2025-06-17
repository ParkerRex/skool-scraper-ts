import { BaseScraper } from './base';
import { db } from '../db/client';
import { members } from '../db/schema';
import { SkoolMember } from '../types/skool.types';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';

export class MembersScraper extends BaseScraper {
  private communityUrl: string;

  constructor(auth: any, communityUrl: string) {
    super(auth, 'members');
    this.communityUrl = communityUrl;
  }

  async scrape(): Promise<void> {
    try {
      await this.updateProgress({ status: 'in_progress' });
      this.logger.info('Starting members scrape');

      // First navigate to community home page
      this.logger.info(`Navigating to community: ${this.communityUrl}`);
      await this.page!.goto(this.communityUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await this.page!.waitForTimeout(3000); // Wait for any redirects or JS to settle

      // Take a screenshot for debugging
      const screenshotDir = path.join(process.cwd(), 'data', 'screenshots');
      await fs.mkdir(screenshotDir, { recursive: true });
      await this.page!.screenshot({ path: path.join(screenshotDir, 'community-home.png') });

      // Click on Members tab instead of direct navigation
      this.logger.info('Looking for Members tab to click');
      const membersTabSelectors = [
        'a[href*="/members"]',
        'button:has-text("Members")',
        'a:has-text("Members")',
        '[role="tab"]:has-text("Members")',
        'nav a:has-text("Members")',
        '.nav-link:has-text("Members")',
      ];

      let clicked = false;
      for (const selector of membersTabSelectors) {
        try {
          const element = await this.page!.locator(selector).first();
          if (await element.isVisible()) {
            this.logger.info(`Clicking members tab using selector: ${selector}`);
            await element.click();
            clicked = true;
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      if (!clicked) {
        this.logger.warn('Could not find Members tab to click, trying direct navigation');
        const membersUrl = `${this.communityUrl}/members`;
        await this.page!.goto(membersUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      }

      await this.page!.waitForTimeout(3000); // Wait for content to load

      // Take another screenshot
      await this.page!.screenshot({ path: path.join(screenshotDir, 'members-page.png') });

      // Try multiple selectors for members
      const memberSelectors = [
        '[data-testid="member-card"]',
        '.member-item',
        '[class*="member-card"]',
        '[class*="MemberCard"]',
        'div[class*="member"] a[href*="/members/"]',
        'a[href*="/members/"][class*="link"]',
      ];

      let foundSelector = null;
      for (const selector of memberSelectors) {
        const count = await this.page!.locator(selector).count();
        if (count > 0) {
          foundSelector = selector;
          this.logger.info(`Found members using selector: ${selector} (count: ${count})`);
          break;
        }
      }

      if (!foundSelector) {
        this.logger.error('Could not find any member elements on the page');
        throw new Error('No member elements found - may need to update selectors');
      }

      let totalMembers = 0;
      let hasMore = true;
      let pageNum = 1;

      const progress = await this.getOrCreateProgress();
      if (progress.lastProcessedPage) {
        pageNum = progress.lastProcessedPage + 1;
        totalMembers = progress.totalProcessed;
      }

      while (hasMore) {
        this.logger.info(`Scraping members page ${pageNum}`);

        // Get all member elements on current page
        const memberElements = await this.page!.$$('[data-testid="member-card"], .member-item, [class*="member"]');
        
        const pageMembers: SkoolMember[] = [];

        for (const element of memberElements) {
          try {
            const member = await this.extractMemberData(element);
            if (member) {
              pageMembers.push(member);
              
              // Save to database
              await db
                .insert(members)
                .values({
                  ...member,
                  joinedAt: member.joinedAt,
                  lastActiveAt: member.lastActiveAt,
                  scrapedAt: new Date(),
                })
                .onConflictDoUpdate({
                  target: members.id,
                  set: {
                    displayName: member.displayName,
                    avatar: member.avatar,
                    bio: member.bio,
                    lastActiveAt: member.lastActiveAt,
                    points: member.points,
                    postsCount: member.postsCount,
                    commentsCount: member.commentsCount,
                    scrapedAt: new Date(),
                  },
                });
            }
          } catch (error) {
            this.logger.error(`Failed to extract member data`, error);
          }
        }

        // Save page data to JSON backup
        await this.savePageData(pageNum, pageMembers);

        totalMembers += pageMembers.length;
        await this.updateProgress({
          lastProcessedPage: pageNum,
          totalProcessed: totalMembers,
        });

        // Check if there's a next page
        hasMore = await this.checkForNextPage();
        if (hasMore) {
          await this.goToNextPage();
          pageNum++;
          await this.rateLimitDelay();
        }
      }

      await this.updateProgress({ status: 'completed' });
      this.logger.info(`Completed members scrape. Total members: ${totalMembers}`);

    } catch (error) {
      this.logger.error('Members scrape failed', error);
      await this.updateProgress({ 
        status: 'failed', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  private async extractMemberData(element: any): Promise<SkoolMember | null> {
    try {
      // Extract member data - adjust selectors based on actual SKOOL DOM
      const data = await element.evaluate((el: HTMLElement) => {
        // Profile link to get ID
        const profileLink = el.querySelector('a[href*="/members/"]') as HTMLAnchorElement;
        const id = profileLink?.href.split('/members/')[1]?.split('?')[0] || '';
        
        // Basic info
        const displayName = el.querySelector('[class*="name"], .member-name')?.textContent?.trim() || '';
        const username = el.querySelector('[class*="username"], .member-username')?.textContent?.trim() || displayName;
        const avatar = el.querySelector('img[class*="avatar"], .member-avatar')?.getAttribute('src') || '';
        
        // Stats
        const points = el.querySelector('[class*="points"], .member-points')?.textContent?.match(/\d+/)?.[0] || '0';
        const role = el.querySelector('[class*="role"], .member-role')?.textContent?.trim() || '';
        
        // Activity
        const joinedText = el.querySelector('[class*="joined"], .member-joined')?.textContent || '';
        const activeText = el.querySelector('[class*="active"], .last-active')?.textContent || '';

        return {
          id,
          username,
          displayName,
          avatar,
          role,
          points: parseInt(points),
          joinedText,
          activeText,
        };
      });

      if (!data.id) return null;

      return {
        id: data.id,
        username: data.username,
        displayName: data.displayName,
        avatar: data.avatar,
        role: data.role,
        points: data.points,
        joinedAt: this.parseDate(data.joinedText),
        lastActiveAt: data.activeText ? this.parseDate(data.activeText) : undefined,
        postsCount: 0, // Will be updated when scraping posts
        commentsCount: 0, // Will be updated when scraping comments
      };
    } catch (error) {
      this.logger.error('Failed to extract member data', error);
      return null;
    }
  }

  private parseDate(dateText: string): Date {
    // Parse SKOOL date formats like "2 days ago", "Jan 15, 2024", etc.
    const now = new Date();
    
    if (dateText.includes('ago')) {
      const match = dateText.match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/);
      if (match) {
        const [, amount, unit] = match;
        const value = parseInt(amount);
        
        switch (unit) {
          case 'second': return new Date(now.getTime() - value * 1000);
          case 'minute': return new Date(now.getTime() - value * 60 * 1000);
          case 'hour': return new Date(now.getTime() - value * 60 * 60 * 1000);
          case 'day': return new Date(now.getTime() - value * 24 * 60 * 60 * 1000);
          case 'week': return new Date(now.getTime() - value * 7 * 24 * 60 * 60 * 1000);
          case 'month': return new Date(now.getTime() - value * 30 * 24 * 60 * 60 * 1000);
          case 'year': return new Date(now.getTime() - value * 365 * 24 * 60 * 60 * 1000);
        }
      }
    }
    
    // Try parsing as regular date
    const parsed = new Date(dateText);
    return isNaN(parsed.getTime()) ? now : parsed;
  }

  private async checkForNextPage(): Promise<boolean> {
    // Check for pagination controls
    const nextButton = await this.page!.$('button[aria-label="Next page"], [class*="next"], a[rel="next"]');
    if (!nextButton) return false;
    
    const isDisabled = await nextButton.evaluate(el => 
      el.hasAttribute('disabled') || el.classList.contains('disabled')
    );
    
    return !isDisabled;
  }

  private async goToNextPage(): Promise<void> {
    const nextButton = await this.page!.$('button[aria-label="Next page"], [class*="next"], a[rel="next"]');
    if (nextButton) {
      await nextButton.click();
      await this.page!.waitForLoadState('networkidle');
    }
  }

  private async savePageData(pageNum: number, members: SkoolMember[]): Promise<void> {
    const dataDir = path.join(process.cwd(), 'data', 'members');
    await fs.mkdir(dataDir, { recursive: true });
    
    const filename = path.join(dataDir, `page_${pageNum.toString().padStart(4, '0')}.json`);
    await fs.writeFile(filename, JSON.stringify(members, null, 2));
  }
}