/**
 * Cool S-cool - Main Application
 *
 * Pressure-free Curriculum Practice App
 * Version 2.0
 *
 * Implements North Star requirements:
 * - Calm, Encouraging, Neutral, Private UX
 * - Topic selection by theme
 * - Quiz session with time modes
 * - Answer feedback with explanations
 * - Session summary
 * - Progress/proficiency display
 * - Settings and export
 */

(function() {
  'use strict';

  // ============================================================
  // Application State
  // ============================================================

  const App = {
    engine: null,
    cam: null,
    questionBanks: new Map(),
    questionCounts: new Map(),  // Store question counts per topic
    currentView: 'loading',
    selectedTopic: null,
    selectedTimeMode: 'unlimited',
    sessionStartTime: null,
    timerInterval: null,
    questionStartTime: null
  };

  // ============================================================
  // Data Loading
  // ============================================================

  async function loadCAM() {
    try {
      const response = await fetch('../cam/data/icse-class5-mathematics-cam.json');
      if (!response.ok) throw new Error('Failed to load CAM');
      App.cam = await response.json();
      return true;
    } catch (error) {
      console.error('Error loading CAM:', error);
      return false;
    }
  }

  async function loadQuestionBank(topicId) {
    if (App.questionBanks.has(topicId)) {
      return App.questionBanks.get(topicId);
    }

    // Convert topic ID to filename format: T01.01 -> T01.01-topic-name.json
    const topic = App.engine.getCAMTopic(topicId);
    if (!topic) return null;

    const fileName = `${topicId}-${topic.topic_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')}.json`;

    try {
      const response = await fetch(`../questions/data/${fileName}`);
      if (!response.ok) {
        // Try alternative filename patterns
        const files = await tryLoadQuestionBankAlternatives(topicId);
        if (files) return files;
        throw new Error(`Question bank not found: ${fileName}`);
      }
      const data = await response.json();
      App.questionBanks.set(topicId, data);
      App.engine.registerQuestionBank(topicId, data);
      return data;
    } catch (error) {
      console.error(`Error loading question bank for ${topicId}:`, error);
      return null;
    }
  }

  async function tryLoadQuestionBankAlternatives(topicId) {
    // Map of known topic IDs to their file names
    const knownFiles = {
      'T01.01': 'T01.01-place-value-number-sense.json',
      'T01.02': 'T01.02-natural-whole-numbers.json',
      'T01.03': 'T01.03-roman-numerals.json',
      'T02.01': 'T02.01-addition-subtraction.json',
      'T02.02': 'T02.02-multiplication.json',
      'T02.03': 'T02.03-division.json',
      'T02.04': 'T02.04-order-of-operations.json',
      'T03.01': 'T03.01-fractions.json',
      'T03.02': 'T03.02-decimals.json',
      'T04.01': 'T04.01-factors-multiples.json',
      'T04.02': 'T04.02-divisibility.json',
      'T04.03': 'T04.03-hcf-lcm.json',
      'T05.01': 'T05.01-negative-numbers.json',
      'T06.01': 'T06.01-basic-geometrical-ideas.json',
      'T06.02': 'T06.02-elementary-shapes.json',
      'T06.03': 'T06.03-polygons.json',
      'T06.04': 'T06.04-circles.json',
      'T06.05': 'T06.05-3d-shapes.json',
      'T07.01': 'T07.01-length-distance.json',
      'T07.02': 'T07.02-mass-weight.json',
      'T07.03': 'T07.03-capacity-volume.json',
      'T07.04': 'T07.04-time.json',
      'T07.05': 'T07.05-perimeter-area.json',
      'T07.06': 'T07.06-money.json',
      'T08.01': 'T08.01-percentage.json',
      'T09.01': 'T09.01-data-collection-organization.json',
      'T09.02': 'T09.02-data-representation.json',
      'T09.03': 'T09.03-data-interpretation.json',
      'T09.04': 'T09.04-basic-statistics.json',
      'T10.01': 'T10.01-number-patterns.json',
      'T10.02': 'T10.02-geometric-patterns.json',
      'T10.03': 'T10.03-patterns-real-life.json'
    };

    const fileName = knownFiles[topicId];
    if (!fileName) return null;

    try {
      const response = await fetch(`../questions/data/${fileName}`);
      if (!response.ok) return null;
      const data = await response.json();
      App.questionBanks.set(topicId, data);
      App.engine.registerQuestionBank(topicId, data);
      return data;
    } catch (error) {
      return null;
    }
  }

  // Preload question counts for all topics (for display in topic cards)
  async function preloadQuestionCounts() {
    const knownFiles = {
      'T01.01': 'T01.01-place-value-number-sense.json',
      'T01.02': 'T01.02-natural-whole-numbers.json',
      'T01.03': 'T01.03-roman-numerals.json',
      'T02.01': 'T02.01-addition-subtraction.json',
      'T02.02': 'T02.02-multiplication.json',
      'T02.03': 'T02.03-division.json',
      'T02.04': 'T02.04-order-of-operations.json',
      'T03.01': 'T03.01-fractions.json',
      'T03.02': 'T03.02-decimals.json',
      'T04.01': 'T04.01-factors-multiples.json',
      'T04.02': 'T04.02-divisibility.json',
      'T04.03': 'T04.03-hcf-lcm.json',
      'T05.01': 'T05.01-negative-numbers.json',
      'T06.01': 'T06.01-basic-geometrical-ideas.json',
      'T06.02': 'T06.02-elementary-shapes.json',
      'T06.03': 'T06.03-polygons.json',
      'T06.04': 'T06.04-circles.json',
      'T06.05': 'T06.05-3d-shapes.json',
      'T07.01': 'T07.01-length-distance.json',
      'T07.02': 'T07.02-mass-weight.json',
      'T07.03': 'T07.03-capacity-volume.json',
      'T07.04': 'T07.04-time.json',
      'T07.05': 'T07.05-perimeter-area.json',
      'T07.06': 'T07.06-money.json',
      'T08.01': 'T08.01-percentage.json',
      'T09.01': 'T09.01-data-collection-organization.json',
      'T09.02': 'T09.02-data-representation.json',
      'T09.03': 'T09.03-data-interpretation.json',
      'T09.04': 'T09.04-basic-statistics.json',
      'T10.01': 'T10.01-number-patterns.json',
      'T10.02': 'T10.02-geometric-patterns.json',
      'T10.03': 'T10.03-patterns-real-life.json'
    };

    // Load all question counts in parallel
    const promises = Object.entries(knownFiles).map(async ([topicId, fileName]) => {
      try {
        const response = await fetch(`../questions/data/${fileName}`);
        if (response.ok) {
          const data = await response.json();
          const count = data.questions?.length || data.metadata?.question_count?.total || 15;
          App.questionCounts.set(topicId, count);
        }
      } catch (e) {
        App.questionCounts.set(topicId, 15); // Default
      }
    });

    await Promise.all(promises);
  }

  // ============================================================
  // View Management
  // ============================================================

  function showView(viewId) {
    document.querySelectorAll('.view').forEach(view => {
      view.classList.remove('active');
    });
    const view = document.getElementById(`${viewId}-view`);
    if (view) {
      view.classList.add('active');
      App.currentView = viewId;
    }
  }

  function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      // Focus first interactive element
      const firstFocusable = modal.querySelector('button, [tabindex="0"]');
      if (firstFocusable) firstFocusable.focus();
    }
  }

  function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
    }
  }

  function showToast(message, duration = 3000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // ============================================================
  // Topic Browser (Home View)
  // ============================================================

  function renderThemeList() {
    const container = document.getElementById('theme-list');
    const themes = App.engine.getAllThemes();

    container.innerHTML = themes.map(theme => `
      <div class="theme-section" data-theme-id="${theme.theme_id}">
        <div class="theme-header" role="button" tabindex="0" aria-expanded="false">
          <div class="theme-info">
            <div class="theme-icon" aria-hidden="true">${theme.theme_order}</div>
            <div>
              <div class="theme-name">${theme.theme_name}</div>
              <div class="theme-count">${theme.topics.length} topics</div>
            </div>
          </div>
          <svg class="theme-toggle-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
        <div class="topic-list" role="list">
          ${theme.topics.map(topic => renderTopicCard(topic)).join('')}
        </div>
      </div>
    `).join('');

    // Add event listeners
    container.querySelectorAll('.theme-header').forEach(header => {
      header.addEventListener('click', toggleTheme);
      header.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleTheme.call(header);
        }
      });
    });

    container.querySelectorAll('.topic-card').forEach(card => {
      card.addEventListener('click', () => selectTopic(card.dataset.topicId));
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectTopic(card.dataset.topicId);
        }
      });
    });

    // Expand first theme by default
    if (themes.length > 0) {
      const firstTheme = container.querySelector('.theme-section');
      if (firstTheme) {
        firstTheme.classList.add('expanded');
        firstTheme.querySelector('.theme-header').setAttribute('aria-expanded', 'true');
      }
    }
  }

  function renderTopicCard(topic) {
    const proficiency = App.engine.getTopicProficiency(topic.topic_id);
    const bandClass = proficiency.band.replace(/_/g, '-');
    const conceptCount = topic.concepts?.length || 0;
    const questionCount = App.questionCounts.get(topic.topic_id) || 15;

    return `
      <div class="topic-card" data-topic-id="${topic.topic_id}" role="listitem" tabindex="0">
        <div class="topic-info">
          <div class="topic-name">${topic.topic_name}</div>
          <div class="topic-concepts">${conceptCount} concepts | ${questionCount} questions</div>
        </div>
        <div class="topic-proficiency">
          <span class="proficiency-badge ${bandClass}">${proficiency.label}</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>
      </div>
    `;
  }

  function toggleTheme() {
    const section = this.closest('.theme-section');
    const isExpanded = section.classList.contains('expanded');

    // Close all themes
    document.querySelectorAll('.theme-section').forEach(s => {
      s.classList.remove('expanded');
      s.querySelector('.theme-header').setAttribute('aria-expanded', 'false');
    });

    // Toggle clicked theme
    if (!isExpanded) {
      section.classList.add('expanded');
      this.setAttribute('aria-expanded', 'true');
    }
  }

  function selectTopic(topicId) {
    App.selectedTopic = App.engine.getCAMTopic(topicId);
    if (!App.selectedTopic) return;

    // Update modal
    document.getElementById('modal-topic-name').textContent = App.selectedTopic.topic_name;

    // Reset time mode selection
    App.selectedTimeMode = 'unlimited';
    document.querySelectorAll('.time-mode-option').forEach(opt => {
      opt.classList.remove('selected');
      opt.setAttribute('aria-checked', 'false');
    });
    document.querySelector('[data-mode="unlimited"]').classList.add('selected');
    document.querySelector('[data-mode="unlimited"]').setAttribute('aria-checked', 'true');

    showModal('time-mode-modal');
  }

  // ============================================================
  // Time Mode Modal
  // ============================================================

  function initTimeModeModal() {
    document.querySelectorAll('.time-mode-option').forEach(option => {
      option.addEventListener('click', () => selectTimeMode(option.dataset.mode));
      option.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectTimeMode(option.dataset.mode);
        }
      });
    });

    document.getElementById('modal-cancel-btn').addEventListener('click', () => {
      hideModal('time-mode-modal');
    });

    document.getElementById('modal-start-btn').addEventListener('click', startQuiz);

    // Close modal on escape
    document.getElementById('time-mode-modal').addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        hideModal('time-mode-modal');
      }
    });
  }

  function selectTimeMode(mode) {
    App.selectedTimeMode = mode;

    document.querySelectorAll('.time-mode-option').forEach(opt => {
      const isSelected = opt.dataset.mode === mode;
      opt.classList.toggle('selected', isSelected);
      opt.setAttribute('aria-checked', isSelected ? 'true' : 'false');
    });
  }

  // ============================================================
  // Quiz Session
  // ============================================================

  async function startQuiz() {
    hideModal('time-mode-modal');
    showView('loading');

    // Load question bank for topic
    const questionBank = await loadQuestionBank(App.selectedTopic.topic_id);
    if (!questionBank) {
      showToast('Could not load questions for this topic');
      showView('home');
      return;
    }

    // Create session
    try {
      App.engine.createSession({
        topicId: App.selectedTopic.topic_id,
        timeMode: App.selectedTimeMode,
        questionCount: 10
      });
      App.engine.startSession();
    } catch (error) {
      console.error('Error creating session:', error);
      showToast('Could not start quiz session');
      showView('home');
      return;
    }

    // Setup quiz view
    setupQuizView();
    showView('quiz');

    // Start timer
    App.sessionStartTime = Date.now();
    App.questionStartTime = Date.now();
    startTimer();

    // Render first question
    renderCurrentQuestion();
  }

  function setupQuizView() {
    const session = App.engine.getSession();

    document.getElementById('quiz-topic-name').textContent = session.config.topic_name;
    document.getElementById('total-questions').textContent = session.questions.length;

    updateQuizProgress();
  }

  function startTimer() {
    if (App.timerInterval) clearInterval(App.timerInterval);

    const session = App.engine.getSession();
    const timeLimit = session.config.time_limit_ms;

    if (!timeLimit) {
      document.getElementById('timer-display').textContent = 'Unlimited';
      return;
    }

    App.timerInterval = setInterval(() => {
      const elapsed = Date.now() - App.sessionStartTime;
      const remaining = Math.max(0, timeLimit - elapsed);

      App.engine.updateSessionTime(elapsed);

      // Update display
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      const display = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      document.getElementById('timer-display').textContent = display;

      // Warning when low on time
      const timerEl = document.getElementById('quiz-timer');
      if (remaining < 60000) {
        timerEl.classList.add('warning');
      } else {
        timerEl.classList.remove('warning');
      }

      // Time's up
      if (remaining <= 0) {
        clearInterval(App.timerInterval);
        endQuizSession(true);
      }
    }, 1000);
  }

  function stopTimer() {
    if (App.timerInterval) {
      clearInterval(App.timerInterval);
      App.timerInterval = null;
    }
  }

  function updateQuizProgress() {
    const session = App.engine.getSession();
    const current = session.progress.current_question_index + 1;
    const total = session.questions.length;
    const percent = (current / total) * 100;

    document.getElementById('current-question-num').textContent = current;
    document.getElementById('quiz-progress-bar').style.width = `${percent}%`;

    const progressBar = document.querySelector('.quiz-progress-bar');
    progressBar.setAttribute('aria-valuenow', Math.round(percent));
  }

  function renderCurrentQuestion() {
    const question = App.engine.getCurrentQuestion();
    if (!question) {
      endQuizSession(true);
      return;
    }

    const session = App.engine.getSession();
    const questionNum = session.progress.current_question_index + 1;

    document.getElementById('question-number').textContent = `Question ${questionNum}`;
    document.getElementById('question-text').textContent = question.question_text;

    // Hide feedback
    document.getElementById('feedback-section').classList.remove('visible', 'correct', 'incorrect');

    // Show appropriate input type
    const optionsContainer = document.getElementById('answer-options');
    const inputContainer = document.getElementById('answer-input-container');
    const orderingContainer = document.getElementById('ordering-container');

    optionsContainer.style.display = 'none';
    inputContainer.style.display = 'none';
    orderingContainer.style.display = 'none';

    switch (question.type) {
      case 'mcq':
        renderMCQOptions(question);
        optionsContainer.style.display = 'flex';
        break;
      case 'true_false':
        renderTrueFalseOptions();
        optionsContainer.style.display = 'flex';
        break;
      case 'fill_blank':
        inputContainer.style.display = 'block';
        document.getElementById('fill-blank-input').value = '';
        document.getElementById('fill-blank-input').className = 'fill-blank-input';
        document.getElementById('fill-blank-input').disabled = false;
        document.getElementById('fill-blank-input').focus();
        break;
      case 'ordering':
        renderOrderingItems(question);
        orderingContainer.style.display = 'block';
        break;
      default:
        renderMCQOptions(question);
        optionsContainer.style.display = 'flex';
    }

    // Reset buttons
    document.getElementById('submit-btn').style.display = 'inline-flex';
    document.getElementById('submit-btn').disabled = true;
    document.getElementById('next-btn').style.display = 'none';
    document.getElementById('finish-btn').style.display = 'none';
    document.getElementById('skip-btn').disabled = false;

    // Record question start time
    App.questionStartTime = Date.now();
  }

  function renderMCQOptions(question) {
    const container = document.getElementById('answer-options');
    container.innerHTML = question.options.map(opt => `
      <div class="answer-option" data-value="${opt.id}" role="radio" aria-checked="false" tabindex="0">
        <span class="answer-option-marker">${opt.id}</span>
        <span class="answer-option-text">${opt.text}</span>
      </div>
    `).join('');

    container.querySelectorAll('.answer-option').forEach(option => {
      option.addEventListener('click', () => selectAnswer(option));
      option.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectAnswer(option);
        }
      });
    });
  }

  function renderTrueFalseOptions() {
    const container = document.getElementById('answer-options');
    container.innerHTML = `
      <div class="true-false-options">
        <div class="answer-option" data-value="True" role="radio" aria-checked="false" tabindex="0">
          <span class="answer-option-marker">T</span>
          <span class="answer-option-text">True</span>
        </div>
        <div class="answer-option" data-value="False" role="radio" aria-checked="false" tabindex="0">
          <span class="answer-option-marker">F</span>
          <span class="answer-option-text">False</span>
        </div>
      </div>
    `;

    container.querySelectorAll('.answer-option').forEach(option => {
      option.addEventListener('click', () => selectAnswer(option));
      option.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectAnswer(option);
        }
      });
    });
  }

  function renderOrderingItems(question) {
    const container = document.getElementById('ordering-items');
    const items = [...(question.ordering_items || [])];

    // Shuffle items
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }

    container.innerHTML = items.map((item, index) => `
      <div class="ordering-item" data-value="${item}" draggable="true">
        <span class="ordering-item-handle">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="6" r="1.5"></circle>
            <circle cx="15" cy="6" r="1.5"></circle>
            <circle cx="9" cy="12" r="1.5"></circle>
            <circle cx="15" cy="12" r="1.5"></circle>
            <circle cx="9" cy="18" r="1.5"></circle>
            <circle cx="15" cy="18" r="1.5"></circle>
          </svg>
        </span>
        <span class="ordering-item-number">${index + 1}</span>
        <span class="ordering-item-text">${item}</span>
      </div>
    `).join('');

    // Enable drag and drop
    initDragAndDrop();
    document.getElementById('submit-btn').disabled = false;
  }

  function initDragAndDrop() {
    const container = document.getElementById('ordering-items');
    let draggedItem = null;

    container.querySelectorAll('.ordering-item').forEach(item => {
      item.addEventListener('dragstart', e => {
        draggedItem = item;
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });

      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        draggedItem = null;
        updateOrderingNumbers();
      });

      item.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });

      item.addEventListener('drop', e => {
        e.preventDefault();
        if (draggedItem && draggedItem !== item) {
          const allItems = [...container.querySelectorAll('.ordering-item')];
          const draggedIndex = allItems.indexOf(draggedItem);
          const targetIndex = allItems.indexOf(item);

          if (draggedIndex < targetIndex) {
            item.after(draggedItem);
          } else {
            item.before(draggedItem);
          }
        }
      });
    });
  }

  function updateOrderingNumbers() {
    document.querySelectorAll('#ordering-items .ordering-item').forEach((item, index) => {
      item.querySelector('.ordering-item-number').textContent = index + 1;
    });
  }

  let selectedAnswerValue = null;

  function selectAnswer(option) {
    // Check if disabled (after submission)
    if (option.classList.contains('disabled')) return;

    const container = option.closest('.answer-options, .true-false-options');
    if (!container) return;

    // Deselect all
    container.querySelectorAll('.answer-option').forEach(opt => {
      opt.classList.remove('selected');
      opt.setAttribute('aria-checked', 'false');
    });

    // Select this one
    option.classList.add('selected');
    option.setAttribute('aria-checked', 'true');
    selectedAnswerValue = option.dataset.value;

    // Enable submit button
    document.getElementById('submit-btn').disabled = false;
  }

  function getSelectedAnswer() {
    const question = App.engine.getCurrentQuestion();
    if (!question) return null;

    switch (question.type) {
      case 'mcq':
      case 'true_false':
        return selectedAnswerValue;
      case 'fill_blank':
        return document.getElementById('fill-blank-input').value.trim();
      case 'ordering':
        return [...document.querySelectorAll('#ordering-items .ordering-item')]
          .map(item => item.dataset.value);
      default:
        return selectedAnswerValue;
    }
  }

  function handleSubmit() {
    const answer = getSelectedAnswer();
    if (!answer || (typeof answer === 'string' && !answer)) {
      showToast('Please select or enter an answer');
      return;
    }

    const timeTaken = Date.now() - App.questionStartTime;
    const result = App.engine.submitAnswer(answer, timeTaken);

    showFeedback(result);
    disableAnswerSelection();

    // Update progress
    updateQuizProgress();

    // Show appropriate button
    document.getElementById('submit-btn').style.display = 'none';
    document.getElementById('skip-btn').disabled = true;

    if (result.isSessionComplete) {
      document.getElementById('finish-btn').style.display = 'inline-flex';
    } else {
      document.getElementById('next-btn').style.display = 'inline-flex';
      document.getElementById('next-btn').focus();
    }
  }

  function showFeedback(result) {
    const feedbackSection = document.getElementById('feedback-section');
    const feedbackTitle = document.getElementById('feedback-title');
    const feedbackExplanation = document.getElementById('feedback-explanation');
    const feedbackIcon = document.getElementById('feedback-icon');

    feedbackSection.classList.remove('correct', 'incorrect');
    feedbackSection.classList.add('visible', result.isCorrect ? 'correct' : 'incorrect');

    if (result.isCorrect) {
      feedbackTitle.textContent = 'Correct';
      feedbackIcon.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    } else {
      feedbackTitle.textContent = 'Not quite';
      feedbackIcon.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
    }

    // Show explanation
    let explanationHtml = '';
    if (!result.isCorrect) {
      explanationHtml += `<p><strong>The correct answer is:</strong> ${formatAnswer(result.correctAnswer)}</p>`;
    }
    if (result.explanation?.text) {
      explanationHtml += `<p>${result.explanation.text}</p>`;
    }
    if (result.xpEarned > 0) {
      explanationHtml += `<p><strong>+${result.xpEarned} XP</strong></p>`;
    }
    feedbackExplanation.innerHTML = explanationHtml;

    // Highlight correct/incorrect options
    const question = App.engine.getSession().questions[App.engine.getSession().progress.current_question_index - 1];
    if (question && (question.type === 'mcq' || question.type === 'true_false')) {
      highlightAnswers(result.correctAnswer, result.isCorrect);
    }

    // Highlight fill-in-the-blank input
    if (question && question.type === 'fill_blank') {
      const input = document.getElementById('fill-blank-input');
      input.classList.add(result.isCorrect ? 'correct' : 'incorrect');
    }
  }

  function formatAnswer(answer) {
    if (Array.isArray(answer)) {
      return answer.join(' → ');
    }
    return answer;
  }

  function highlightAnswers(correctAnswer, wasCorrect) {
    document.querySelectorAll('.answer-option').forEach(option => {
      const value = option.dataset.value;
      if (value === correctAnswer) {
        option.classList.add('correct');
      } else if (option.classList.contains('selected') && !wasCorrect) {
        option.classList.add('incorrect');
      }
    });
  }

  function disableAnswerSelection() {
    document.querySelectorAll('.answer-option').forEach(option => {
      option.classList.add('disabled');
    });
    document.getElementById('fill-blank-input').disabled = true;
  }

  function handleSkip() {
    const result = App.engine.skipQuestion();
    selectedAnswerValue = null;

    if (result.isSessionComplete) {
      endQuizSession(true);
    } else {
      renderCurrentQuestion();
      updateQuizProgress();
    }
  }

  function handleNext() {
    selectedAnswerValue = null;
    renderCurrentQuestion();
  }

  function endQuizSession(completed) {
    stopTimer();

    const summary = App.engine.endSession(completed);
    renderSummary(summary);
    showView('summary');
  }

  // ============================================================
  // Session Summary
  // ============================================================

  function renderSummary(summary) {
    document.getElementById('summary-topic-name').textContent = summary.topic_name;
    document.getElementById('stat-answered').textContent = summary.questions_answered;
    document.getElementById('stat-correct').textContent = summary.questions_correct;
    document.getElementById('stat-xp').textContent = summary.xp_earned;

    // Format time
    const elapsed = summary.time_elapsed_ms || (Date.now() - App.sessionStartTime);
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    document.getElementById('stat-time').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    // Show proficiency
    const proficiency = App.engine.getTopicProficiency(summary.topic_id);
    const bandEl = document.getElementById('summary-proficiency-band');
    bandEl.textContent = proficiency.label;
    bandEl.className = `proficiency-band-large ${proficiency.band.replace(/_/g, '-')}`;

    document.getElementById('summary-proficiency-message').textContent =
      QuizEngine.getBandMessage(proficiency.band);
  }

  // ============================================================
  // Settings
  // ============================================================

  function renderSettings() {
    const stats = App.engine.getStorageStats();
    const sessions = App.engine.getSessionHistory();

    document.getElementById('total-sessions').textContent = sessions.length;
    document.getElementById('total-xp').textContent = App.engine.getTotalXP();
    document.getElementById('topics-started').textContent = stats.topics_tracked;

    // Count mastered topics
    let masteredCount = 0;
    const topics = App.engine.getAllTopics();
    for (const topic of topics) {
      const prof = App.engine.getTopicProficiency(topic.topic_id);
      if (prof.band === 'exam_ready') masteredCount++;
    }
    document.getElementById('topics-mastered').textContent = masteredCount;
  }

  function initSettings() {
    document.getElementById('export-btn').addEventListener('click', handleExport);
    document.getElementById('import-btn').addEventListener('click', () => {
      document.getElementById('import-file').click();
    });
    document.getElementById('import-file').addEventListener('change', handleImport);
    document.getElementById('reset-btn').addEventListener('click', () => {
      showModal('reset-modal');
    });
    document.getElementById('reset-cancel-btn').addEventListener('click', () => {
      hideModal('reset-modal');
    });
    document.getElementById('reset-confirm-btn').addEventListener('click', handleReset);
    document.getElementById('back-to-home-btn').addEventListener('click', () => {
      showView('home');
      renderThemeList();
    });
  }

  function handleExport() {
    const json = App.engine.exportToJson(true);
    const filename = QuizEngine.generateExportFilename();

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Progress exported successfully');
  }

  function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        const result = App.engine.importData(data);

        if (result.success) {
          showToast('Progress imported successfully');
          renderSettings();
          renderThemeList();
        } else {
          showToast('Failed to import: ' + (result.errors?.[0] || 'Invalid file'));
        }
      } catch (error) {
        showToast('Failed to read file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleReset() {
    App.engine.clearAllData();
    hideModal('reset-modal');
    renderSettings();
    renderThemeList();
    showToast('All progress has been reset');
  }

  // ============================================================
  // Event Listeners
  // ============================================================

  function initEventListeners() {
    // Logo click -> home
    document.getElementById('logo-btn').addEventListener('click', e => {
      e.preventDefault();
      if (App.currentView === 'quiz') {
        if (confirm('Leave this quiz? Your progress in this session will be saved.')) {
          endQuizSession(false);
          showView('home');
          renderThemeList();
        }
      } else {
        showView('home');
        renderThemeList();
      }
    });

    // Settings button
    document.getElementById('settings-btn').addEventListener('click', () => {
      if (App.currentView === 'quiz') {
        if (confirm('Leave this quiz? Your progress in this session will be saved.')) {
          endQuizSession(false);
        } else {
          return;
        }
      }
      renderSettings();
      showView('settings');
    });

    // Quiz buttons
    document.getElementById('submit-btn').addEventListener('click', handleSubmit);
    document.getElementById('skip-btn').addEventListener('click', handleSkip);
    document.getElementById('next-btn').addEventListener('click', handleNext);
    document.getElementById('finish-btn').addEventListener('click', () => endQuizSession(true));

    // Summary buttons
    document.getElementById('practice-again-btn').addEventListener('click', () => {
      if (App.selectedTopic) {
        selectTopic(App.selectedTopic.topic_id);
      }
    });
    document.getElementById('choose-topic-btn').addEventListener('click', () => {
      showView('home');
      renderThemeList();
    });

    // Fill in blank input
    document.getElementById('fill-blank-input').addEventListener('input', e => {
      document.getElementById('submit-btn').disabled = !e.target.value.trim();
    });

    document.getElementById('fill-blank-input').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !document.getElementById('submit-btn').disabled) {
        handleSubmit();
      }
    });

    // Keyboard navigation
    document.addEventListener('keydown', e => {
      if (App.currentView === 'quiz') {
        const question = App.engine.getCurrentQuestion();
        if (!question) return;

        if (question.type === 'mcq' && e.key >= 'a' && e.key <= 'd') {
          const option = document.querySelector(`[data-value="${e.key.toUpperCase()}"]`);
          if (option && !option.classList.contains('disabled')) {
            selectAnswer(option);
          }
        }
      }
    });
  }

  // ============================================================
  // Initialization
  // ============================================================

  async function init() {
    // Load CAM data
    const camLoaded = await loadCAM();
    if (!camLoaded) {
      document.querySelector('#loading-view p').textContent = 'Error loading data. Please refresh the page.';
      return;
    }

    // Initialize engine
    App.engine = QuizEngine.createQuizEngine({ userId: 'default' });
    App.engine.setCAM(App.cam);

    // Preload question counts for topic display
    await preloadQuestionCounts();

    // Initialize UI
    initEventListeners();
    initTimeModeModal();
    initSettings();

    // Render home view
    renderThemeList();
    showView('home');
  }

  // Start app when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
