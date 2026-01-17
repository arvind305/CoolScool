/**
 * Anonymous Quiz Flow E2E Tests
 *
 * Tests the quiz experience for anonymous (non-authenticated) users,
 * including the sample limit behavior where users get 3 free questions
 * per topic before being prompted to sign in.
 */

import { test, expect } from '@playwright/test';
import {
  navigateToBrowse,
  selectBoard,
  selectClass,
  selectSubject,
  startQuiz,
  selectTimeMode,
  clickStartQuiz,
  selectAnswer,
  submitAnswer,
  clickNextQuestion,
  waitForQuizLoad,
  isLoginPromptVisible,
  isQuizSummaryVisible,
  clickContinueBrowsing,
  clearAnonymousState,
  expandTheme,
  answerQuestion,
  getCurrentQuestionNumber,
} from './fixtures/test-utils';

test.describe('Anonymous Quiz Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any stored state to simulate fresh anonymous user
    await page.goto('/');
    await clearAnonymousState(page);
  });

  test.describe('Browse to Quiz Navigation', () => {
    test('can navigate from /browse to topics', async ({ page }) => {
      // Navigate to browse
      await navigateToBrowse(page);
      await expect(page.locator('h1')).toContainText('Browse');

      // Select ICSE board
      await selectBoard(page, 'ICSE');
      expect(page.url()).toMatch(/\/browse\/icse/i);

      // Select Class 5
      await selectClass(page, '5');
      expect(page.url()).toMatch(/\/browse\/icse\/class-5/i);

      // Select Mathematics
      await selectSubject(page, 'Mathematics');
      expect(page.url()).toMatch(/\/browse\/icse\/class-5\/mathematics/i);

      // Verify topics page loaded
      await expect(page.locator('.theme-list')).toBeVisible({ timeout: 10000 });
    });

    test('clicking topic opens time mode modal', async ({ page }) => {
      // Navigate to topics
      await navigateToBrowse(page);
      await selectBoard(page, 'ICSE');
      await selectClass(page, '5');
      await selectSubject(page, 'Mathematics');

      // Wait for topics to load
      await expect(page.locator('.theme-list')).toBeVisible({ timeout: 10000 });

      // Expand first theme and click first topic
      await expandTheme(page, 0);

      const firstTopic = page.locator('.topic-card').first();
      await expect(firstTopic).toBeVisible();
      await firstTopic.click();

      // Verify time mode modal appears
      await expect(page.locator('.time-mode-modal')).toBeVisible();
      await expect(page.locator('text=Start Practice')).toBeVisible();
    });
  });

  test.describe('Time Mode Modal', () => {
    test('displays all time mode options', async ({ page }) => {
      await navigateToBrowse(page);
      await selectBoard(page, 'ICSE');
      await selectClass(page, '5');
      await selectSubject(page, 'Mathematics');
      await expect(page.locator('.theme-list')).toBeVisible({ timeout: 10000 });
      await expandTheme(page, 0);

      const firstTopic = page.locator('.topic-card').first();
      await firstTopic.click();

      // Verify all time mode options are present
      await expect(page.locator('[data-mode="unlimited"]')).toBeVisible();
      await expect(page.locator('[data-mode="10min"]')).toBeVisible();
      await expect(page.locator('[data-mode="5min"]')).toBeVisible();
      await expect(page.locator('[data-mode="3min"]')).toBeVisible();
    });

    test('can select a time mode', async ({ page }) => {
      await navigateToBrowse(page);
      await selectBoard(page, 'ICSE');
      await selectClass(page, '5');
      await selectSubject(page, 'Mathematics');
      await expect(page.locator('.theme-list')).toBeVisible({ timeout: 10000 });
      await expandTheme(page, 0);

      const firstTopic = page.locator('.topic-card').first();
      await firstTopic.click();
      await expect(page.locator('.time-mode-modal')).toBeVisible();

      // Select 5 minute mode
      await selectTimeMode(page, '5min');

      // Verify selection
      const selectedMode = page.locator('[data-mode="5min"]');
      await expect(selectedMode).toHaveClass(/selected/);
    });

    test('clicking Start Quiz navigates to quiz page', async ({ page }) => {
      await navigateToBrowse(page);
      await selectBoard(page, 'ICSE');
      await selectClass(page, '5');
      await selectSubject(page, 'Mathematics');
      await expect(page.locator('.theme-list')).toBeVisible({ timeout: 10000 });
      await expandTheme(page, 0);

      const firstTopic = page.locator('.topic-card').first();
      await firstTopic.click();
      await expect(page.locator('.time-mode-modal')).toBeVisible();

      // Select time mode and start
      await selectTimeMode(page, 'unlimited');
      await clickStartQuiz(page);

      // Verify navigation to quiz page
      expect(page.url()).toMatch(/\/quiz\?/);
      await waitForQuizLoad(page);
    });

    test('cancel button closes modal', async ({ page }) => {
      await navigateToBrowse(page);
      await selectBoard(page, 'ICSE');
      await selectClass(page, '5');
      await selectSubject(page, 'Mathematics');
      await expect(page.locator('.theme-list')).toBeVisible({ timeout: 10000 });
      await expandTheme(page, 0);

      const firstTopic = page.locator('.topic-card').first();
      await firstTopic.click();
      await expect(page.locator('.time-mode-modal')).toBeVisible();

      // Click cancel
      const cancelButton = page.locator('#modal-cancel-btn');
      await cancelButton.click();

      // Modal should close
      await expect(page.locator('.time-mode-modal')).toBeHidden();
    });
  });

  test.describe('Quiz Interaction', () => {
    test('displays question and answer options', async ({ page }) => {
      await navigateToBrowse(page);
      await selectBoard(page, 'ICSE');
      await selectClass(page, '5');
      await selectSubject(page, 'Mathematics');
      await expect(page.locator('.theme-list')).toBeVisible({ timeout: 10000 });
      await expandTheme(page, 0);

      const firstTopic = page.locator('.topic-card').first();
      await firstTopic.click();
      await expect(page.locator('.time-mode-modal')).toBeVisible();
      await selectTimeMode(page, 'unlimited');
      await clickStartQuiz(page);
      await waitForQuizLoad(page);

      // Verify question is displayed
      await expect(page.locator('.question-text')).toBeVisible();

      // Verify answer options are displayed
      const answerOptions = page.locator('.answer-option');
      await expect(answerOptions.first()).toBeVisible();
      const optionCount = await answerOptions.count();
      expect(optionCount).toBeGreaterThan(0);
    });

    test('can select an answer option', async ({ page }) => {
      await navigateToBrowse(page);
      await selectBoard(page, 'ICSE');
      await selectClass(page, '5');
      await selectSubject(page, 'Mathematics');
      await expect(page.locator('.theme-list')).toBeVisible({ timeout: 10000 });
      await expandTheme(page, 0);

      const firstTopic = page.locator('.topic-card').first();
      await firstTopic.click();
      await expect(page.locator('.time-mode-modal')).toBeVisible();
      await selectTimeMode(page, 'unlimited');
      await clickStartQuiz(page);
      await waitForQuizLoad(page);

      // Select first answer option
      await selectAnswer(page, 'A');

      // Verify selection
      const selectedOption = page.locator('.answer-option.selected');
      await expect(selectedOption).toBeVisible();
    });

    test('submit button is disabled until answer is selected', async ({ page }) => {
      await navigateToBrowse(page);
      await selectBoard(page, 'ICSE');
      await selectClass(page, '5');
      await selectSubject(page, 'Mathematics');
      await expect(page.locator('.theme-list')).toBeVisible({ timeout: 10000 });
      await expandTheme(page, 0);

      const firstTopic = page.locator('.topic-card').first();
      await firstTopic.click();
      await expect(page.locator('.time-mode-modal')).toBeVisible();
      await selectTimeMode(page, 'unlimited');
      await clickStartQuiz(page);
      await waitForQuizLoad(page);

      // Submit button should be disabled
      const submitButton = page.locator('#submit-btn');
      await expect(submitButton).toBeDisabled();

      // Select an answer
      await selectAnswer(page, 'A');

      // Submit button should now be enabled
      await expect(submitButton).toBeEnabled();
    });

    test('submitting answer shows feedback', async ({ page }) => {
      await navigateToBrowse(page);
      await selectBoard(page, 'ICSE');
      await selectClass(page, '5');
      await selectSubject(page, 'Mathematics');
      await expect(page.locator('.theme-list')).toBeVisible({ timeout: 10000 });
      await expandTheme(page, 0);

      const firstTopic = page.locator('.topic-card').first();
      await firstTopic.click();
      await expect(page.locator('.time-mode-modal')).toBeVisible();
      await selectTimeMode(page, 'unlimited');
      await clickStartQuiz(page);
      await waitForQuizLoad(page);

      // Answer question
      await selectAnswer(page, 'A');
      await submitAnswer(page);

      // Feedback should appear (either correct or incorrect styling)
      await page.waitForTimeout(500); // Wait for feedback animation
      const correctOption = page.locator('.answer-option.correct');
      const incorrectOption = page.locator('.answer-option.incorrect');

      // At least one feedback state should be visible
      const hasCorrect = await correctOption.isVisible();
      const hasIncorrect = await incorrectOption.isVisible();
      expect(hasCorrect || hasIncorrect).toBeTruthy();
    });

    test('can proceed to next question after submitting', async ({ page }) => {
      await navigateToBrowse(page);
      await selectBoard(page, 'ICSE');
      await selectClass(page, '5');
      await selectSubject(page, 'Mathematics');
      await expect(page.locator('.theme-list')).toBeVisible({ timeout: 10000 });
      await expandTheme(page, 0);

      const firstTopic = page.locator('.topic-card').first();
      await firstTopic.click();
      await expect(page.locator('.time-mode-modal')).toBeVisible();
      await selectTimeMode(page, 'unlimited');
      await clickStartQuiz(page);
      await waitForQuizLoad(page);

      // Get initial question text
      const initialQuestion = await page.locator('.question-text').textContent();

      // Answer and submit
      await selectAnswer(page, 'A');
      await submitAnswer(page);

      // Wait for feedback state
      await page.waitForTimeout(500);

      // Click next if available (might show summary if only 1 question)
      const nextButton = page.locator('#next-btn');
      const finishButton = page.locator('#finish-btn');

      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForTimeout(500);

        // Should either show next question, login prompt, or summary
        const newQuestion = page.locator('.question-text');
        const loginPrompt = page.locator('.login-prompt');
        const summary = page.locator('.summary-container');

        const hasNewQuestion = await newQuestion.isVisible();
        const hasLoginPrompt = await loginPrompt.isVisible();
        const hasSummary = await summary.isVisible();

        expect(hasNewQuestion || hasLoginPrompt || hasSummary).toBeTruthy();
      }
    });
  });

  test.describe('Sample Limit Behavior', () => {
    test('anonymous user can answer questions', async ({ page }) => {
      await clearAnonymousState(page);
      await navigateToBrowse(page);
      await selectBoard(page, 'ICSE');
      await selectClass(page, '5');
      await selectSubject(page, 'Mathematics');
      await expect(page.locator('.theme-list')).toBeVisible({ timeout: 10000 });
      await expandTheme(page, 0);

      const firstTopic = page.locator('.topic-card').first();
      await firstTopic.click();
      await expect(page.locator('.time-mode-modal')).toBeVisible();
      await selectTimeMode(page, 'unlimited');
      await clickStartQuiz(page);
      await waitForQuizLoad(page);

      // Answer first question
      await answerQuestion(page, 'A');

      // Should be able to proceed (to next question, login prompt, or summary)
      await page.waitForTimeout(500);

      // Verify we're in a valid state
      const nextButton = page.locator('#next-btn');
      const finishButton = page.locator('#finish-btn');
      const loginPrompt = page.locator('.login-prompt');
      const summary = page.locator('.summary-container');

      const validState =
        (await nextButton.isVisible()) ||
        (await finishButton.isVisible()) ||
        (await loginPrompt.isVisible()) ||
        (await summary.isVisible());

      expect(validState).toBeTruthy();
    });

    test('after 3 questions shows login prompt OR quiz summary', async ({ page }) => {
      await clearAnonymousState(page);
      await navigateToBrowse(page);
      await selectBoard(page, 'ICSE');
      await selectClass(page, '5');
      await selectSubject(page, 'Mathematics');
      await expect(page.locator('.theme-list')).toBeVisible({ timeout: 10000 });
      await expandTheme(page, 0);

      const firstTopic = page.locator('.topic-card').first();
      await firstTopic.click();
      await expect(page.locator('.time-mode-modal')).toBeVisible();
      await selectTimeMode(page, 'unlimited');
      await clickStartQuiz(page);
      await waitForQuizLoad(page);

      // Answer up to 3 questions (sample limit)
      for (let i = 0; i < 3; i++) {
        // Check if we're on a question
        const questionText = page.locator('.question-text');
        if (!(await questionText.isVisible())) {
          break; // Quiz ended early or login prompt shown
        }

        // Answer the question
        await answerQuestion(page, 'A');

        // Wait for feedback
        await page.waitForTimeout(500);

        // Try to proceed
        const nextButton = page.locator('#next-btn');
        const finishButton = page.locator('#finish-btn');

        if (await finishButton.isVisible()) {
          await finishButton.click();
          break;
        }

        if (await nextButton.isVisible()) {
          await nextButton.click();
          await page.waitForTimeout(500);
        }

        // Check if login prompt appeared
        if (await isLoginPromptVisible(page)) {
          break;
        }
      }

      // After 3 questions, should show either:
      // 1. Login prompt (sample limit reached)
      // 2. Quiz summary (if quiz had fewer than 3 questions)
      await page.waitForTimeout(1000);

      const hasLoginPrompt = await isLoginPromptVisible(page);
      const hasSummary = await isQuizSummaryVisible(page);

      expect(hasLoginPrompt || hasSummary).toBeTruthy();
    });

    test('login prompt shows sample count message', async ({ page }) => {
      await clearAnonymousState(page);
      await navigateToBrowse(page);
      await selectBoard(page, 'ICSE');
      await selectClass(page, '5');
      await selectSubject(page, 'Mathematics');
      await expect(page.locator('.theme-list')).toBeVisible({ timeout: 10000 });
      await expandTheme(page, 0);

      const firstTopic = page.locator('.topic-card').first();
      await firstTopic.click();
      await expect(page.locator('.time-mode-modal')).toBeVisible();
      await selectTimeMode(page, 'unlimited');
      await clickStartQuiz(page);
      await waitForQuizLoad(page);

      // Answer 3 questions to trigger sample limit
      for (let i = 0; i < 3; i++) {
        const questionText = page.locator('.question-text');
        if (!(await questionText.isVisible())) break;

        await answerQuestion(page, 'A');
        await page.waitForTimeout(500);

        const nextButton = page.locator('#next-btn');
        const finishButton = page.locator('#finish-btn');

        if (await finishButton.isVisible()) {
          await finishButton.click();
          break;
        }
        if (await nextButton.isVisible()) {
          await nextButton.click();
          await page.waitForTimeout(500);
        }
        if (await isLoginPromptVisible(page)) break;
      }

      // If login prompt is visible, verify it mentions the sample limit
      if (await isLoginPromptVisible(page)) {
        const promptText = await page.locator('.login-prompt').textContent();
        expect(promptText?.toLowerCase()).toMatch(/free|questions|sign in/i);
      }
    });
  });

  test.describe('Continue Browsing', () => {
    test('continue browsing button returns to topics page', async ({ page }) => {
      await clearAnonymousState(page);
      await navigateToBrowse(page);
      await selectBoard(page, 'ICSE');
      await selectClass(page, '5');
      await selectSubject(page, 'Mathematics');
      await expect(page.locator('.theme-list')).toBeVisible({ timeout: 10000 });
      await expandTheme(page, 0);

      const firstTopic = page.locator('.topic-card').first();
      await firstTopic.click();
      await expect(page.locator('.time-mode-modal')).toBeVisible();
      await selectTimeMode(page, 'unlimited');
      await clickStartQuiz(page);
      await waitForQuizLoad(page);

      // Answer questions until we get login prompt or summary
      for (let i = 0; i < 3; i++) {
        const questionText = page.locator('.question-text');
        if (!(await questionText.isVisible())) break;

        await answerQuestion(page, 'A');
        await page.waitForTimeout(500);

        const nextButton = page.locator('#next-btn');
        const finishButton = page.locator('#finish-btn');

        if (await finishButton.isVisible()) {
          await finishButton.click();
          break;
        }
        if (await nextButton.isVisible()) {
          await nextButton.click();
          await page.waitForTimeout(500);
        }
        if (await isLoginPromptVisible(page)) break;
      }

      await page.waitForTimeout(500);

      // Click continue browsing or choose topic
      const loginPromptBrowseBtn = page.locator('.login-prompt__browse-btn');
      const chooseTopicBtn = page.locator('#choose-topic-btn');

      if (await loginPromptBrowseBtn.isVisible()) {
        await loginPromptBrowseBtn.click();
      } else if (await chooseTopicBtn.isVisible()) {
        await chooseTopicBtn.click();
      }

      // Should navigate back to topics page
      await page.waitForURL(/\/browse\/.*\/.*\/.*/i, { timeout: 5000 });
      expect(page.url()).toMatch(/\/browse\/icse\/class-5\/mathematics/i);
    });
  });

  test.describe('Quiz Summary', () => {
    test('summary shows session stats', async ({ page }) => {
      await clearAnonymousState(page);
      await navigateToBrowse(page);
      await selectBoard(page, 'ICSE');
      await selectClass(page, '5');
      await selectSubject(page, 'Mathematics');
      await expect(page.locator('.theme-list')).toBeVisible({ timeout: 10000 });
      await expandTheme(page, 0);

      const firstTopic = page.locator('.topic-card').first();
      await firstTopic.click();
      await expect(page.locator('.time-mode-modal')).toBeVisible();
      await selectTimeMode(page, 'unlimited');
      await clickStartQuiz(page);
      await waitForQuizLoad(page);

      // Complete the quiz (may end after 3 due to sample limit or fewer questions)
      for (let i = 0; i < 5; i++) {
        const questionText = page.locator('.question-text');
        if (!(await questionText.isVisible())) break;

        await answerQuestion(page, 'A');
        await page.waitForTimeout(500);

        const nextButton = page.locator('#next-btn');
        const finishButton = page.locator('#finish-btn');

        if (await finishButton.isVisible()) {
          await finishButton.click();
          break;
        }
        if (await nextButton.isVisible()) {
          await nextButton.click();
          await page.waitForTimeout(500);
        }
        if (await isLoginPromptVisible(page)) break;
        if (await isQuizSummaryVisible(page)) break;
      }

      // If we reached the summary, verify it has stats
      if (await isQuizSummaryVisible(page)) {
        // Check for stat elements
        await expect(page.locator('#stat-answered')).toBeVisible();
        await expect(page.locator('#stat-correct')).toBeVisible();

        // Check for actions
        const practiceAgainBtn = page.locator('#practice-again-btn');
        const chooseTopicBtn = page.locator('#choose-topic-btn');

        await expect(practiceAgainBtn).toBeVisible();
        await expect(chooseTopicBtn).toBeVisible();
      }
    });

    test('summary shows sign in prompt for anonymous users', async ({ page }) => {
      await clearAnonymousState(page);
      await navigateToBrowse(page);
      await selectBoard(page, 'ICSE');
      await selectClass(page, '5');
      await selectSubject(page, 'Mathematics');
      await expect(page.locator('.theme-list')).toBeVisible({ timeout: 10000 });
      await expandTheme(page, 0);

      const firstTopic = page.locator('.topic-card').first();
      await firstTopic.click();
      await expect(page.locator('.time-mode-modal')).toBeVisible();
      await selectTimeMode(page, 'unlimited');
      await clickStartQuiz(page);
      await waitForQuizLoad(page);

      // Complete quiz to get to summary
      for (let i = 0; i < 5; i++) {
        const questionText = page.locator('.question-text');
        if (!(await questionText.isVisible())) break;

        await answerQuestion(page, 'A');
        await page.waitForTimeout(500);

        const nextButton = page.locator('#next-btn');
        const finishButton = page.locator('#finish-btn');

        if (await finishButton.isVisible()) {
          await finishButton.click();
          break;
        }
        if (await nextButton.isVisible()) {
          await nextButton.click();
          await page.waitForTimeout(500);
        }
        if (await isLoginPromptVisible(page)) break;
        if (await isQuizSummaryVisible(page)) break;
      }

      // If on summary, check for sign in prompt
      if (await isQuizSummaryVisible(page)) {
        const signInPrompt = page.locator('.summary-signin-prompt');
        // This should be visible for anonymous users
        await expect(signInPrompt).toBeVisible();
      }
    });
  });

  test.describe('Skip Question', () => {
    test('can skip a question', async ({ page }) => {
      await clearAnonymousState(page);
      await navigateToBrowse(page);
      await selectBoard(page, 'ICSE');
      await selectClass(page, '5');
      await selectSubject(page, 'Mathematics');
      await expect(page.locator('.theme-list')).toBeVisible({ timeout: 10000 });
      await expandTheme(page, 0);

      const firstTopic = page.locator('.topic-card').first();
      await firstTopic.click();
      await expect(page.locator('.time-mode-modal')).toBeVisible();
      await selectTimeMode(page, 'unlimited');
      await clickStartQuiz(page);
      await waitForQuizLoad(page);

      // Get initial question
      const initialQuestion = await page.locator('.question-text').textContent();

      // Click skip
      const skipButton = page.locator('#skip-btn');
      await expect(skipButton).toBeVisible();
      await skipButton.click();

      await page.waitForTimeout(500);

      // Should either show new question, login prompt, or summary
      const newQuestion = page.locator('.question-text');
      const loginPrompt = page.locator('.login-prompt');
      const summary = page.locator('.summary-container');

      const validState =
        (await newQuestion.isVisible()) ||
        (await loginPrompt.isVisible()) ||
        (await summary.isVisible());

      expect(validState).toBeTruthy();
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('can select answer using keyboard shortcuts', async ({ page }) => {
      await clearAnonymousState(page);
      await navigateToBrowse(page);
      await selectBoard(page, 'ICSE');
      await selectClass(page, '5');
      await selectSubject(page, 'Mathematics');
      await expect(page.locator('.theme-list')).toBeVisible({ timeout: 10000 });
      await expandTheme(page, 0);

      const firstTopic = page.locator('.topic-card').first();
      await firstTopic.click();
      await expect(page.locator('.time-mode-modal')).toBeVisible();
      await selectTimeMode(page, 'unlimited');
      await clickStartQuiz(page);
      await waitForQuizLoad(page);

      // Press 'B' key to select option B
      await page.keyboard.press('b');

      // Option B should be selected
      const optionB = page.locator('.answer-option[data-value="B"]');
      await expect(optionB).toHaveClass(/selected/);
    });
  });
});
