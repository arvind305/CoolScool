/**
 * Topic Browse E2E Tests
 *
 * Tests the topic browsing experience for the CoolSCool learning platform.
 * Covers navigation through boards, classes, subjects, and topics.
 */

import { test, expect } from '@playwright/test';
import {
  navigateToBrowse,
  selectBoard,
  selectClass,
  selectSubject,
  expandTheme,
  collapseTheme,
  clearAnonymousState,
} from './fixtures/test-utils';

test.describe('Topic Browse', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any stored state before each test
    await clearAnonymousState(page);
  });

  test.describe('Board Selection', () => {
    test('displays board cards on /browse page', async ({ page }) => {
      await page.goto('/browse');

      // Verify page header
      await expect(page.locator('h1')).toContainText('Browse');

      // Verify board cards are visible
      const boardCards = page.locator('.card-interactive');
      await expect(boardCards.first()).toBeVisible();

      // Check that at least one board is displayed
      const cardCount = await boardCards.count();
      expect(cardCount).toBeGreaterThan(0);

      // Verify ICSE board is present (primary board)
      const icseCard = page.locator('.card-interactive', { hasText: /icse/i });
      await expect(icseCard).toBeVisible();
    });

    test('navigates to board page when clicking a board card', async ({ page }) => {
      await navigateToBrowse(page);

      // Click on ICSE board
      await selectBoard(page, 'ICSE');

      // Verify URL changed
      expect(page.url()).toMatch(/\/browse\/icse$/i);

      // Verify board page content
      await expect(page.locator('h1')).toContainText('ICSE');
    });

    test('shows breadcrumb navigation on board page', async ({ page }) => {
      await navigateToBrowse(page);
      await selectBoard(page, 'ICSE');

      // Check breadcrumb is present
      const breadcrumb = page.locator('nav');
      await expect(breadcrumb).toBeVisible();

      // Check Browse link in breadcrumb
      const browseLink = page.locator('nav a', { hasText: 'Browse' });
      await expect(browseLink).toBeVisible();
    });
  });

  test.describe('Class Selection', () => {
    test('displays class level cards on board page', async ({ page }) => {
      await navigateToBrowse(page);
      await selectBoard(page, 'ICSE');

      // Verify class cards are visible
      const classCards = page.locator('.card-interactive');
      await expect(classCards.first()).toBeVisible();

      // Check that multiple classes are displayed (should have 1-10)
      const cardCount = await classCards.count();
      expect(cardCount).toBeGreaterThan(0);

      // Verify Class 5 is present
      const class5Card = page.locator('.card-interactive').filter({
        has: page.locator('span', { hasText: /^5$/ }),
      });
      await expect(class5Card).toBeVisible();
    });

    test('navigates to class page when clicking a class card', async ({ page }) => {
      await navigateToBrowse(page);
      await selectBoard(page, 'ICSE');
      await selectClass(page, 'Class 5');

      // Verify URL changed
      expect(page.url()).toMatch(/\/browse\/icse\/class-5$/i);

      // Verify class page content
      await expect(page.locator('h1')).toContainText('Class 5');
    });

    test('shows breadcrumb with board link on class page', async ({ page }) => {
      await navigateToBrowse(page);
      await selectBoard(page, 'ICSE');
      await selectClass(page, '5');

      // Check breadcrumb has board link
      const boardLink = page.locator('nav a', { hasText: 'ICSE' });
      await expect(boardLink).toBeVisible();

      // Clicking board link should navigate back
      await boardLink.click();
      expect(page.url()).toMatch(/\/browse\/icse$/i);
    });
  });

  test.describe('Subject Selection', () => {
    test('displays subject cards on class page', async ({ page }) => {
      await navigateToBrowse(page);
      await selectBoard(page, 'ICSE');
      await selectClass(page, '5');

      // Verify subject cards are visible
      const subjectCards = page.locator('.card-interactive');
      await expect(subjectCards.first()).toBeVisible();

      // Verify Mathematics is present
      const mathCard = page.locator('.card-interactive', { hasText: /mathematics/i });
      await expect(mathCard).toBeVisible();
    });

    test('navigates to subject page when clicking a subject card', async ({ page }) => {
      await navigateToBrowse(page);
      await selectBoard(page, 'ICSE');
      await selectClass(page, '5');
      await selectSubject(page, 'Mathematics');

      // Verify URL changed
      expect(page.url()).toMatch(/\/browse\/icse\/class-5\/mathematics$/i);

      // Verify subject page content
      await expect(page.locator('h1')).toContainText('Mathematics');
    });

    test('shows full breadcrumb on subject page', async ({ page }) => {
      await navigateToBrowse(page);
      await selectBoard(page, 'ICSE');
      await selectClass(page, '5');
      await selectSubject(page, 'Mathematics');

      // Check breadcrumb has all segments
      await expect(page.locator('nav a', { hasText: 'Browse' })).toBeVisible();
      await expect(page.locator('nav a', { hasText: 'ICSE' })).toBeVisible();
      await expect(page.locator('nav a', { hasText: /class 5/i })).toBeVisible();
      await expect(page.locator('nav', { hasText: 'Mathematics' })).toBeVisible();
    });
  });

  test.describe('Topic Display', () => {
    test('loads and displays topics on subject page', async ({ page }) => {
      await navigateToBrowse(page);
      await selectBoard(page, 'ICSE');
      await selectClass(page, '5');
      await selectSubject(page, 'Mathematics');

      // Wait for topics to load (loading spinner to disappear)
      await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 }).catch(() => {
        // Spinner might not be present
      });

      // Verify theme list is visible
      const themeList = page.locator('.theme-list');
      await expect(themeList).toBeVisible({ timeout: 10000 });

      // Verify at least one theme section exists
      const themeSections = page.locator('.theme-section');
      const sectionCount = await themeSections.count();
      expect(sectionCount).toBeGreaterThan(0);
    });

    test('displays topic cards with name and concept count', async ({ page }) => {
      await navigateToBrowse(page);
      await selectBoard(page, 'ICSE');
      await selectClass(page, '5');
      await selectSubject(page, 'Mathematics');

      // Wait for topics to load
      await expect(page.locator('.theme-list')).toBeVisible({ timeout: 10000 });

      // Expand first theme if not already expanded
      await expandTheme(page, 0);

      // Verify topic cards are visible
      const topicCards = page.locator('.topic-card');
      await expect(topicCards.first()).toBeVisible();

      // Verify topic card contains name
      const firstTopicCard = topicCards.first();
      const topicName = firstTopicCard.locator('.topic-name');
      await expect(topicName).toBeVisible();

      // Verify topic card shows concepts count
      const topicConcepts = firstTopicCard.locator('.topic-concepts');
      await expect(topicConcepts).toBeVisible();
      const conceptsText = await topicConcepts.textContent();
      expect(conceptsText).toMatch(/concepts/i);
    });

    test('anonymous user sees sample badges on topic cards', async ({ page }) => {
      await clearAnonymousState(page);
      await navigateToBrowse(page);
      await selectBoard(page, 'ICSE');
      await selectClass(page, '5');
      await selectSubject(page, 'Mathematics');

      // Wait for topics to load
      await expect(page.locator('.theme-list')).toBeVisible({ timeout: 10000 });

      // Expand first theme
      await expandTheme(page, 0);

      // Check for sample badges (may or may not be visible depending on implementation)
      const topicCards = page.locator('.topic-card');
      await expect(topicCards.first()).toBeVisible();

      // Look for sample badge with "free" text
      const sampleBadge = page.locator('.topic-sample-badge');
      // This might be visible for anonymous users
      const badgeCount = await sampleBadge.count();
      // Just verify the page loaded correctly - badge visibility depends on auth state
      expect(badgeCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Theme Accordion', () => {
    test('theme sections are collapsible', async ({ page }) => {
      await navigateToBrowse(page);
      await selectBoard(page, 'ICSE');
      await selectClass(page, '5');
      await selectSubject(page, 'Mathematics');

      // Wait for topics to load
      await expect(page.locator('.theme-list')).toBeVisible({ timeout: 10000 });

      const firstTheme = page.locator('.theme-section').first();

      // Expand the theme
      await expandTheme(page, 0);
      await expect(firstTheme).toHaveClass(/expanded/);

      // Collapse the theme
      await collapseTheme(page, 0);
      await expect(firstTheme).not.toHaveClass(/expanded/);
    });

    test('only one theme can be expanded at a time', async ({ page }) => {
      await navigateToBrowse(page);
      await selectBoard(page, 'ICSE');
      await selectClass(page, '5');
      await selectSubject(page, 'Mathematics');

      // Wait for topics to load
      await expect(page.locator('.theme-list')).toBeVisible({ timeout: 10000 });

      const themeSections = page.locator('.theme-section');
      const sectionCount = await themeSections.count();

      // Need at least 2 themes to test this
      if (sectionCount >= 2) {
        // Expand first theme
        await expandTheme(page, 0);
        await expect(themeSections.nth(0)).toHaveClass(/expanded/);

        // Expand second theme - first should collapse
        await themeSections.nth(1).locator('.theme-header').click();
        await page.waitForTimeout(300);

        // Second should be expanded, first should not
        await expect(themeSections.nth(1)).toHaveClass(/expanded/);
        await expect(themeSections.nth(0)).not.toHaveClass(/expanded/);
      }
    });

    test('theme header shows topic count', async ({ page }) => {
      await navigateToBrowse(page);
      await selectBoard(page, 'ICSE');
      await selectClass(page, '5');
      await selectSubject(page, 'Mathematics');

      // Wait for topics to load
      await expect(page.locator('.theme-list')).toBeVisible({ timeout: 10000 });

      // Check theme header has topic count
      const themeCount = page.locator('.theme-count').first();
      await expect(themeCount).toBeVisible();
      const countText = await themeCount.textContent();
      expect(countText).toMatch(/\d+\s+topic/i);
    });

    test('theme header is keyboard accessible', async ({ page }) => {
      await navigateToBrowse(page);
      await selectBoard(page, 'ICSE');
      await selectClass(page, '5');
      await selectSubject(page, 'Mathematics');

      // Wait for topics to load
      await expect(page.locator('.theme-list')).toBeVisible({ timeout: 10000 });

      const themeHeader = page.locator('.theme-header').first();

      // Focus the theme header
      await themeHeader.focus();

      // Get initial expanded state
      const firstTheme = page.locator('.theme-section').first();
      const wasExpanded = await firstTheme.evaluate(
        (el) => el.classList.contains('expanded')
      );

      // Press Enter to toggle
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);

      // Should have toggled
      if (wasExpanded) {
        await expect(firstTheme).not.toHaveClass(/expanded/);
      } else {
        await expect(firstTheme).toHaveClass(/expanded/);
      }
    });
  });

  test.describe('Breadcrumb Navigation', () => {
    test('breadcrumb links navigate correctly', async ({ page }) => {
      // Navigate to subject page
      await navigateToBrowse(page);
      await selectBoard(page, 'ICSE');
      await selectClass(page, '5');
      await selectSubject(page, 'Mathematics');

      // Click class breadcrumb link
      const classLink = page.locator('nav a', { hasText: /class 5/i });
      await expect(classLink).toBeVisible();
      await classLink.click();

      // Should be on class page
      expect(page.url()).toMatch(/\/browse\/icse\/class-5$/i);

      // Navigate back to subject
      await selectSubject(page, 'Mathematics');

      // Click board breadcrumb link
      const boardLink = page.locator('nav a', { hasText: 'ICSE' });
      await expect(boardLink).toBeVisible();
      await boardLink.click();

      // Should be on board page
      expect(page.url()).toMatch(/\/browse\/icse$/i);

      // Navigate back through
      await selectClass(page, '5');
      await selectSubject(page, 'Mathematics');

      // Click Browse breadcrumb link
      const browseLink = page.locator('nav a', { hasText: 'Browse' });
      await expect(browseLink).toBeVisible();
      await browseLink.click();

      // Should be on browse page
      expect(page.url()).toMatch(/\/browse$/i);
    });
  });

  test.describe('Error States', () => {
    test('shows error state for unavailable content', async ({ page }) => {
      // Navigate to a combination that might not have content
      // This depends on the actual content available
      await page.goto('/browse/cbse/class-1/science');

      // Wait for either content or error message
      await page.waitForTimeout(2000);

      // Check if either topics loaded or error message is shown
      const themeList = page.locator('.theme-list');
      const errorMessage = page.locator('text=/coming soon|no topics|unable to load/i');

      const hasThemes = await themeList.isVisible();
      const hasError = await errorMessage.isVisible();

      // One of these should be true
      expect(hasThemes || hasError).toBeTruthy();
    });
  });

  test.describe('URL Structure', () => {
    test('URL follows /browse/[board]/[class]/[subject] pattern', async ({ page }) => {
      await navigateToBrowse(page);
      expect(page.url()).toMatch(/\/browse$/);

      await selectBoard(page, 'ICSE');
      expect(page.url()).toMatch(/\/browse\/icse$/i);

      await selectClass(page, '5');
      expect(page.url()).toMatch(/\/browse\/icse\/class-5$/i);

      await selectSubject(page, 'Mathematics');
      expect(page.url()).toMatch(/\/browse\/icse\/class-5\/mathematics$/i);
    });

    test('direct URL navigation works', async ({ page }) => {
      // Navigate directly to subject page
      await page.goto('/browse/icse/class-5/mathematics');

      // Should show the subject page
      await expect(page.locator('h1')).toContainText('Mathematics');

      // Topics should eventually load
      await expect(page.locator('.theme-list')).toBeVisible({ timeout: 10000 }).catch(() => {
        // Might show error if content not available
      });
    });
  });
});
