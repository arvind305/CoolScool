/**
 * E2E Test Utilities
 *
 * Helper functions for common operations in Playwright E2E tests.
 * These utilities streamline navigation, selection, and interaction
 * with the CoolSCool learning platform.
 */

import { Page, expect } from '@playwright/test';

/**
 * Navigate to the browse page
 */
export async function navigateToBrowse(page: Page): Promise<void> {
  await page.goto('/browse');
  await expect(page.locator('h1')).toContainText('Browse');
}

/**
 * Select a board from the browse page
 * @param page Playwright page object
 * @param board Board name or ID (e.g., 'ICSE', 'icse', 'CBSE', 'cbse')
 */
export async function selectBoard(page: Page, board: string): Promise<void> {
  // Try to find the board card by name (case-insensitive partial match)
  const boardCard = page.locator('.card-interactive', {
    hasText: new RegExp(board, 'i'),
  }).first();

  await expect(boardCard).toBeVisible();
  await boardCard.click();

  // Wait for navigation to complete
  await page.waitForURL(/\/browse\/[a-z]+$/i);
}

/**
 * Select a class level from the board page
 * @param page Playwright page object
 * @param classLevel Class level string (e.g., 'Class 5', '5', 'class-5')
 */
export async function selectClass(page: Page, classLevel: string): Promise<void> {
  // Extract the numeric part if present
  const levelMatch = classLevel.match(/\d+/);
  const levelNum = levelMatch ? levelMatch[0] : classLevel;

  // Find the class card - it displays the number prominently
  const classCard = page.locator('.card-interactive').filter({
    has: page.locator('span', { hasText: new RegExp(`^${levelNum}$`) }),
  }).first();

  await expect(classCard).toBeVisible();
  await classCard.click();

  // Wait for navigation to complete
  await page.waitForURL(/\/browse\/[a-z]+\/class-\d+$/i);
}

/**
 * Select a subject from the class page
 * @param page Playwright page object
 * @param subject Subject name (e.g., 'Mathematics', 'Science', 'English')
 */
export async function selectSubject(page: Page, subject: string): Promise<void> {
  // Find the subject card by name
  const subjectCard = page.locator('.card-interactive', {
    hasText: new RegExp(subject, 'i'),
  }).first();

  await expect(subjectCard).toBeVisible();
  await subjectCard.click();

  // Wait for navigation to complete
  await page.waitForURL(/\/browse\/[a-z]+\/class-\d+\/[a-z]+$/i);
}

/**
 * Start a quiz for a specific topic
 * Opens the time mode modal when a topic is clicked
 * @param page Playwright page object
 * @param topicName Topic name to start (partial match supported)
 */
export async function startQuiz(page: Page, topicName: string): Promise<void> {
  // First, ensure a theme section is expanded so topics are visible
  // Click on a theme header to expand it if needed
  const themeSection = page.locator('.theme-section').first();
  const isExpanded = await themeSection.evaluate(
    (el) => el.classList.contains('expanded')
  );

  if (!isExpanded) {
    await themeSection.locator('.theme-header').click();
    // Wait for expansion animation
    await page.waitForTimeout(300);
  }

  // Find the topic card by name
  const topicCard = page.locator('.topic-card', {
    hasText: new RegExp(topicName, 'i'),
  }).first();

  await expect(topicCard).toBeVisible();
  await topicCard.click();

  // Wait for the time mode modal to appear
  await expect(page.locator('.time-mode-modal')).toBeVisible();
}

/**
 * Select a time mode in the time mode modal
 * @param page Playwright page object
 * @param mode Time mode to select ('unlimited', '10min', '5min', '3min')
 */
export async function selectTimeMode(
  page: Page,
  mode: 'unlimited' | '10min' | '5min' | '3min'
): Promise<void> {
  const modeOption = page.locator(`.time-mode-option[data-mode="${mode}"]`);
  await expect(modeOption).toBeVisible();
  await modeOption.click();

  // Verify selection
  await expect(modeOption).toHaveClass(/selected/);
}

/**
 * Click the Start Quiz button in the time mode modal
 */
export async function clickStartQuiz(page: Page): Promise<void> {
  const startButton = page.locator('#modal-start-btn');
  await expect(startButton).toBeVisible();
  await startButton.click();

  // Wait for navigation to quiz page
  await page.waitForURL(/\/quiz\?/);
}

/**
 * Select an answer option in the quiz
 * @param page Playwright page object
 * @param optionIndex Option index (0-based) or letter ('A', 'B', 'C', 'D')
 */
export async function selectAnswer(
  page: Page,
  optionIndex: number | string
): Promise<void> {
  let selector: string;

  if (typeof optionIndex === 'string') {
    // Option letter (A, B, C, D)
    selector = `.answer-option[data-value="${optionIndex.toUpperCase()}"]`;
  } else {
    // Option index (0-based)
    selector = `.answer-option:nth-child(${optionIndex + 1})`;
  }

  const option = page.locator(selector);
  await expect(option).toBeVisible();
  await option.click();

  // Verify selection
  await expect(option).toHaveClass(/selected/);
}

/**
 * Submit the current answer
 */
export async function submitAnswer(page: Page): Promise<void> {
  const submitButton = page.locator('#submit-btn');
  await expect(submitButton).toBeVisible();
  await expect(submitButton).toBeEnabled();
  await submitButton.click();
}

/**
 * Click the Next Question button after submitting
 */
export async function clickNextQuestion(page: Page): Promise<void> {
  const nextButton = page.locator('#next-btn');
  await expect(nextButton).toBeVisible();
  await nextButton.click();
}

/**
 * Skip the current question
 */
export async function skipQuestion(page: Page): Promise<void> {
  const skipButton = page.locator('#skip-btn');
  await expect(skipButton).toBeVisible();
  await skipButton.click();
}

/**
 * Complete a full question cycle (select answer, submit, next)
 * @param page Playwright page object
 * @param answerOption Option to select (index or letter)
 */
export async function answerQuestion(
  page: Page,
  answerOption: number | string = 'A'
): Promise<void> {
  await selectAnswer(page, answerOption);
  await submitAnswer(page);
  // Wait for feedback to appear
  await expect(page.locator('.feedback')).toBeVisible({ timeout: 5000 }).catch(() => {
    // Feedback might not always be present
  });
}

/**
 * Wait for the quiz to load completely
 */
export async function waitForQuizLoad(page: Page): Promise<void> {
  // Wait for loading spinner to disappear
  await expect(
    page.locator('.animate-spin')
  ).toBeHidden({ timeout: 10000 }).catch(() => {
    // Loading spinner might not be present
  });

  // Wait for question to appear
  await expect(page.locator('.question-text')).toBeVisible({ timeout: 10000 });
}

/**
 * Check if the login prompt is visible
 */
export async function isLoginPromptVisible(page: Page): Promise<boolean> {
  const loginPrompt = page.locator('.login-prompt');
  return await loginPrompt.isVisible();
}

/**
 * Check if the quiz summary is visible
 */
export async function isQuizSummaryVisible(page: Page): Promise<boolean> {
  const summary = page.locator('.summary-container');
  return await summary.isVisible();
}

/**
 * Click Continue Browsing button (from login prompt or summary)
 */
export async function clickContinueBrowsing(page: Page): Promise<void> {
  // Try the login prompt button first
  const loginPromptBtn = page.locator('.login-prompt__browse-btn');
  if (await loginPromptBtn.isVisible()) {
    await loginPromptBtn.click();
    return;
  }

  // Try the summary Choose Topic button
  const chooseTopicBtn = page.locator('#choose-topic-btn');
  if (await chooseTopicBtn.isVisible()) {
    await chooseTopicBtn.click();
    return;
  }

  throw new Error('No continue browsing button found');
}

/**
 * Get the current question number from the quiz
 */
export async function getCurrentQuestionNumber(page: Page): Promise<number> {
  const questionNumberEl = page.locator('.question-number');
  const text = await questionNumberEl.textContent();
  const match = text?.match(/Question (\d+)/i);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Expand a theme section by name or index
 * @param page Playwright page object
 * @param themeIdentifier Theme name (partial match) or index (0-based)
 */
export async function expandTheme(
  page: Page,
  themeIdentifier: string | number
): Promise<void> {
  let themeSection;

  if (typeof themeIdentifier === 'number') {
    themeSection = page.locator('.theme-section').nth(themeIdentifier);
  } else {
    themeSection = page.locator('.theme-section', {
      hasText: new RegExp(themeIdentifier, 'i'),
    }).first();
  }

  const isExpanded = await themeSection.evaluate(
    (el) => el.classList.contains('expanded')
  );

  if (!isExpanded) {
    await themeSection.locator('.theme-header').click();
    // Wait for expansion animation
    await page.waitForTimeout(300);
  }

  // Verify expansion
  await expect(themeSection).toHaveClass(/expanded/);
}

/**
 * Collapse a theme section by name or index
 */
export async function collapseTheme(
  page: Page,
  themeIdentifier: string | number
): Promise<void> {
  let themeSection;

  if (typeof themeIdentifier === 'number') {
    themeSection = page.locator('.theme-section').nth(themeIdentifier);
  } else {
    themeSection = page.locator('.theme-section', {
      hasText: new RegExp(themeIdentifier, 'i'),
    }).first();
  }

  const isExpanded = await themeSection.evaluate(
    (el) => el.classList.contains('expanded')
  );

  if (isExpanded) {
    await themeSection.locator('.theme-header').click();
    // Wait for collapse animation
    await page.waitForTimeout(300);
  }

  // Verify collapse
  await expect(themeSection).not.toHaveClass(/expanded/);
}

/**
 * Navigate through the entire browse flow to reach topics
 * @param page Playwright page object
 * @param board Board to select
 * @param classLevel Class level to select
 * @param subject Subject to select
 */
export async function navigateToTopics(
  page: Page,
  board: string,
  classLevel: string,
  subject: string
): Promise<void> {
  await navigateToBrowse(page);
  await selectBoard(page, board);
  await selectClass(page, classLevel);
  await selectSubject(page, subject);

  // Wait for topics to load
  await expect(page.locator('.theme-list')).toBeVisible({ timeout: 10000 });
}

/**
 * Clear local storage to reset anonymous user state
 */
export async function clearAnonymousState(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Check if the sample badge is visible on a topic card
 */
export async function hasSampleBadge(
  page: Page,
  topicName: string
): Promise<boolean> {
  const topicCard = page.locator('.topic-card', {
    hasText: new RegExp(topicName, 'i'),
  }).first();

  const sampleBadge = topicCard.locator('.topic-sample-badge');
  return await sampleBadge.isVisible();
}
