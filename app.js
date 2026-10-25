/**
 * EcoSphere AI - Application Logic
 * Manages Chat Sessions, Speech Synthesis, Markdown Rendering,
 * LocalStorage Persistence, and User Interactions.
 */

// Initialize Core AI Engine
const engine = new EcoSphereEngine(ECO_KNOWLEDGE_BASE);

// State Management
const state = {
  currentSessionId: null,
  sessions: [],
  isStreaming: false,
  activeSpeechUtterance: null,
  activeSpeechButton: null,
  theme: localStorage.getItem("ecosphere_theme") || "dark"
};

// DOM References
const elements = {
  appContainer: document.getElementById("app-container"),
  sidebar: document.getElementById("sidebar"),
  btnToggleSidebar: document.getElementById("btn-toggle-sidebar"),
  btnNewChat: document.getElementById("btn-new-chat"),
  historyContainer: document.getElementById("history-container"),
  messagesContainer: document.getElementById("messages-container"),
  welcomeScreen: document.getElementById("welcome-screen"),
  chatTextarea: document.getElementById("chat-textarea"),
  btnSend: document.getElementById("btn-send"),
  btnClearChat: document.getElementById("btn-clear-chat"),
  btnThemeToggle: document.getElementById("btn-theme-toggle"),
  modelSelector: document.getElementById("model-selector"),
  activeEngineLabel: document.getElementById("active-engine-label"),
  
  // Modals
  btnSettings: document.getElementById("btn-settings"),
  settingsModal: document.getElementById("settings-modal"),
  btnCloseSettings: document.getElementById("btn-close-settings"),
  btnSaveSettings: document.getElementById("btn-save-settings"),
  
  btnLibrary: document.getElementById("btn-library"),
  libraryModal: document.getElementById("library-modal"),
  btnCloseLibrary: document.getElementById("btn-close-library"),
  libraryList: document.getElementById("library-list"),

  // Settings inputs
  inputEngineMode: document.getElementById("setting-engine-mode"),
  inputGeminiKey: document.getElementById("setting-gemini-key"),
  inputGeminiModel: document.getElementById("setting-gemini-model"),
  inputOpenaiKey: document.getElementById("setting-openai-key"),
  inputOpenaiModel: document.getElementById("setting-openai-model"),
  inputToneStyle: document.getElementById("setting-tone-style"),
  inputStreamingSpeed: document.getElementById("setting-streaming-speed")
};

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  loadSessions();
  populateLibraryModal();
  bindEventListeners();
  syncSettingsInputs();

  // If no sessions, create the first one
  if (state.sessions.length === 0) {
    createNewSession();
  } else {
    // Load most recent
    switchSession(state.sessions[0].id);
  }
});

// --- THEME ---
function initTheme() {
  document.documentElement.setAttribute("data-theme", state.theme);
  updateThemeIcon();
}

function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", state.theme);
  localStorage.setItem("ecosphere_theme", state.theme);
  updateThemeIcon();
}

function updateThemeIcon() {
  if (elements.btnThemeToggle) {
    elements.btnThemeToggle.innerHTML = state.theme === "dark" 
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
  }
}

// --- SESSIONS & STORAGE ---
function loadSessions() {
  try {
    const saved = localStorage.getItem("ecosphere_sessions");
    if (saved) {
      state.sessions = JSON.parse(saved);
    }
  } catch (e) {
    console.error("Failed to load sessions", e);
    state.sessions = [];
  }
  renderHistoryList();
}

function saveSessions() {
  try {
    localStorage.setItem("ecosphere_sessions", JSON.stringify(state.sessions));
  } catch (e) {
    console.error("Failed to save sessions", e);
  }
  renderHistoryList();
}

function createNewSession() {
  const newSession = {
    id: "session_" + Date.now(),
    title: "New Conversation",
    timestamp: Date.now(),
    messages: []
  };
  state.sessions.unshift(newSession);
  saveSessions();
  switchSession(newSession.id);
}

function switchSession(sessionId) {
  if (state.isStreaming) return; // Prevent switching mid-stream
  stopSpeaking();
  state.currentSessionId = sessionId;
  const current = state.sessions.find(s => s.id === sessionId);
  if (!current) return;

  // Sync conversation history into engine
  engine.conversationHistory = current.messages.map(m => ({
    role: m.role,
    content: m.content,
    timestamp: m.timestamp
  }));

  renderMessages();
  renderHistoryList();
  elements.chatTextarea.focus();
}

function deleteSession(sessionId, event) {
  if (event) event.stopPropagation();
  state.sessions = state.sessions.filter(s => s.id !== sessionId);
  if (state.sessions.length === 0) {
    createNewSession();
  } else {
    if (state.currentSessionId === sessionId) {
      switchSession(state.sessions[0].id);
    } else {
      saveSessions();
    }
  }
}

function renderHistoryList() {
  elements.historyContainer.innerHTML = "";
  state.sessions.forEach(session => {
    const item = document.createElement("div");
    item.className = `history-item ${session.id === state.currentSessionId ? "active" : ""}`;
    item.innerHTML = `
      <span style="overflow: hidden; text-overflow: ellipsis;">${escapeHtml(session.title)}</span>
      <button class="btn-del-chat" title="Delete chat">&times;</button>
    `;
    item.addEventListener("click", () => switchSession(session.id));
    const btnDel = item.querySelector(".btn-del-chat");
    btnDel.addEventListener("click", (e) => deleteSession(session.id, e));
    elements.historyContainer.appendChild(item);
  });
}

// --- MESSAGE RENDERING ---
function renderMessages() {
  const session = state.sessions.find(s => s.id === state.currentSessionId);
  if (!session || session.messages.length === 0) {
    elements.welcomeScreen.style.display = "flex";
    // Clear out old message nodes but keep welcome screen
    const messageRows = elements.messagesContainer.querySelectorAll(".message-row");
    messageRows.forEach(row => row.remove());
    return;
  }

  elements.welcomeScreen.style.display = "none";
  // Rebuild message rows
  const messageRows = elements.messagesContainer.querySelectorAll(".message-row");
  messageRows.forEach(row => row.remove());

  session.messages.forEach(msg => {
    appendMessageDOM(msg.role, msg.content, msg.followUps, false);
  });

  scrollToBottom();
}

function appendMessageDOM(role, content, followUps = [], isStreaming = false) {
  elements.welcomeScreen.style.display = "none";

  const row = document.createElement("div");
  row.className = `message-row ${role === "user" ? "user" : "bot"}`;

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.innerHTML = role === "user" ? "👤" : "🌱";

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";

  const contentDiv = document.createElement("div");
  contentDiv.className = "bubble-content";
  contentDiv.innerHTML = renderMarkdown(content);
  bubble.appendChild(contentDiv);

  if (role === "assistant") {
    // Cursor placeholder if streaming
    if (isStreaming) {
      const cursor = document.createElement("span");
      cursor.className = "typing-cursor";
      bubble.appendChild(cursor);
    }

    // Message action buttons (Copy, Speak, Regenerate)
    const actions = document.createElement("div");
    actions.className = "message-actions";
    actions.innerHTML = `
      <button class="btn-msg-action btn-copy" title="Copy response">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        <span>Copy</span>
      </button>
      <button class="btn-msg-action btn-speak" title="Listen with gentle voice">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
        <span>Listen</span>
      </button>
    `;

    // Action button listeners
    const btnCopy = actions.querySelector(".btn-copy");
    btnCopy.addEventListener("click", () => copyText(content, btnCopy));

    const btnSpeak = actions.querySelector(".btn-speak");
    btnSpeak.addEventListener("click", () => toggleSpeak(content, btnSpeak));

    bubble.appendChild(actions);

    // Follow-up suggestion chips
    if (followUps && followUps.length > 0 && !isStreaming) {
      const followupsContainer = document.createElement("div");
      followupsContainer.className = "followups-container";
      followUps.forEach(promptText => {
        const chip = document.createElement("div");
        chip.className = "followup-chip";
        chip.innerHTML = `<span>💬 ${escapeHtml(promptText)}</span>`;
        chip.addEventListener("click", () => submitQuery(promptText));
        followupsContainer.appendChild(chip);
      });
      bubble.appendChild(followupsContainer);
    }
  }

  row.appendChild(avatar);
  row.appendChild(bubble);
  elements.messagesContainer.appendChild(row);
  scrollToBottom();

  return { row, bubble, contentDiv };
}

// --- SENDING & STREAMING ---
async function handleSend() {
  const query = elements.chatTextarea.value.trim();
  if (!query || state.isStreaming) return;

  elements.chatTextarea.value = "";
  elements.chatTextarea.style.height = "auto";
  await submitQuery(query);
}

async function submitQuery(queryText) {
  if (state.isStreaming) return;

  const session = state.sessions.find(s => s.id === state.currentSessionId);
  if (!session) return;

  // Auto-name conversation based on first query
  if (session.messages.length === 0) {
    session.title = queryText.length > 30 ? queryText.substring(0, 30) + "..." : queryText;
    renderHistoryList();
  }

  // 1. Add user message
  session.messages.push({
    role: "user",
    content: queryText,
    timestamp: Date.now()
  });
  saveSessions();
  appendMessageDOM("user", queryText);

  // 2. Prepare streaming assistant DOM
  state.isStreaming = true;
  elements.btnSend.disabled = true;

  let assistantContent = "";
  const domRefs = appendMessageDOM("assistant", "", [], true);
  const cursor = domRefs.bubble.querySelector(".typing-cursor");

  try {
    await engine.generateResponse(queryText, (chunk, isDone, followUps) => {
      assistantContent += chunk;
      domRefs.contentDiv.innerHTML = renderMarkdown(assistantContent);
      scrollToBottom();

      if (isDone) {
        if (cursor) cursor.remove();
        state.isStreaming = false;
        elements.btnSend.disabled = false;

        // Persist to session
        session.messages.push({
          role: "assistant",
          content: assistantContent,
          followUps: followUps || [],
          timestamp: Date.now()
        });
        saveSessions();

        // Attach action handlers & chips
        const actions = domRefs.bubble.querySelector(".message-actions");
        if (actions) {
          const btnCopy = actions.querySelector(".btn-copy");
          if (btnCopy) btnCopy.onclick = () => copyText(assistantContent, btnCopy);

          const btnSpeak = actions.querySelector(".btn-speak");
          if (btnSpeak) btnSpeak.onclick = () => toggleSpeak(assistantContent, btnSpeak);
        }

        if (followUps && followUps.length > 0) {
          const followupsContainer = document.createElement("div");
          followupsContainer.className = "followups-container";
          followUps.forEach(promptText => {
            const chip = document.createElement("div");
            chip.className = "followup-chip";
            chip.innerHTML = `<span>💬 ${escapeHtml(promptText)}</span>`;
            chip.addEventListener("click", () => submitQuery(promptText));
            followupsContainer.appendChild(chip);
          });
          domRefs.bubble.appendChild(followupsContainer);
        }
      }
    });
  } catch (err) {
    console.error("Streaming error:", err);
    if (cursor) cursor.remove();
    state.isStreaming = false;
    elements.btnSend.disabled = false;
    domRefs.contentDiv.innerHTML += `<p style="color: #ef4444;">*[Apologies, an unexpected issue occurred. Please try again.]*</p>`;
  }
}

// --- TEXT-TO-SPEECH (GENTLE VOICE) ---
function toggleSpeak(text, buttonElement) {
  if (!("speechSynthesis" in window)) {
    alert("Speech synthesis is not supported in your browser.");
    return;
  }

  // If already speaking this message, stop
  if (state.activeSpeechButton === buttonElement) {
    stopSpeaking();
    return;
  }

  // Stop any other active speech
  stopSpeaking();

  // Strip markdown symbols for natural reading
  const cleanSpeechText = text
    .replace(/[#*_~`>-]/g, "")
    .replace(/\[.*?\]/g, "")
    .replace(/\(.*?\)/g, "");

  const utterance = new SpeechSynthesisUtterance(cleanSpeechText);

  // Set gentle speech parameters
  utterance.rate = 0.95; // slightly slower, calm pace
  utterance.pitch = 1.05; // warm, gentle pitch

  // Pick high-quality English voice if available
  const voices = window.speechSynthesis.getVoices();
  const naturalVoice = voices.find(v => (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Samantha") || v.name.includes("Jenny")) && v.lang.startsWith("en"));
  if (naturalVoice) {
    utterance.voice = naturalVoice;
  }

  utterance.onstart = () => {
    state.activeSpeechUtterance = utterance;
    state.activeSpeechButton = buttonElement;
    buttonElement.classList.add("speaking");
    buttonElement.querySelector("span").textContent = "Stop";
  };

  utterance.onend = utterance.onerror = () => {
    stopSpeaking();
  };

  window.speechSynthesis.speak(utterance);
}

function stopSpeaking() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  if (state.activeSpeechButton) {
    state.activeSpeechButton.classList.remove("speaking");
    state.activeSpeechButton.querySelector("span").textContent = "Listen";
  }
  state.activeSpeechUtterance = null;
  state.activeSpeechButton = null;
}

// --- UTILITIES ---
function copyText(text, btnElement) {
  navigator.clipboard.writeText(text).then(() => {
    const span = btnElement.querySelector("span");
    const original = span.textContent;
    span.textContent = "Copied!";
    setTimeout(() => { span.textContent = original; }, 2000);
  });
}

function scrollToBottom() {
  elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
}

function escapeHtml(text) {
  return (text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Lightweight, robust markdown parser for headers, lists, bold, italics, blockquotes
 */
function renderMarkdown(md) {
  if (!md) return "";

  let html = md;

  // Escape raw HTML tags
  html = html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Re-allow blockquotes (since &gt; was replaced)
  html = html.replace(/^&gt;\s?(.*)$/gm, "<blockquote>$1</blockquote>");

  // Headers
  html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
  html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
  html = html.replace(/^# (.*$)/gim, "<h1>$1</h1>");

  // Bold & Italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/gim, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>");
  html = html.replace(/\*(.*?)\*/gim, "<em>$1</em>");
  html = html.replace(/_(.*?)_/gim, "<em>$1</em>");

  // Horizontal rules
  html = html.replace(/^---$/gim, "<hr/>");

  // Bullet points
  html = html.replace(/^\s*[-*]\s+(.*)$/gim, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>)/gms, "<ul>$1</ul>");

  // Numbered points
  html = html.replace(/^\s*\d+\.\s+(.*)$/gim, "<li>$1</li>");

  // Paragraphs
  const blocks = html.split(/\n\n+/);
  html = blocks.map(block => {
    const trimmed = block.trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("<h") || trimmed.startsWith("<ul") || trimmed.startsWith("<ol") || trimmed.startsWith("<block") || trimmed.startsWith("<hr")) {
      return trimmed;
    }
    return `<p>${trimmed.replace(/\n/g, "<br/>")}</p>`;
  }).join("");

  return html;
}

// --- EVENT LISTENERS ---
function bindEventListeners() {
  // New chat
  elements.btnNewChat.addEventListener("click", () => createNewSession());

  // Keyboard shortcut Ctrl+K for new chat
  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      createNewSession();
    }
  });

  // Mobile sidebar toggle
  if (elements.btnToggleSidebar) {
    elements.btnToggleSidebar.addEventListener("click", () => {
      elements.sidebar.classList.toggle("open");
    });
  }

  // Clear current chat
  elements.btnClearChat.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear this conversation?")) {
      const session = state.sessions.find(s => s.id === state.currentSessionId);
      if (session) {
        session.messages = [];
        saveSessions();
        renderMessages();
      }
    }
  });

  // Theme toggle
  elements.btnThemeToggle.addEventListener("click", toggleTheme);

  // Send button & textarea auto-resize
  elements.btnSend.addEventListener("click", handleSend);

  elements.chatTextarea.addEventListener("input", () => {
    elements.chatTextarea.style.height = "auto";
    elements.chatTextarea.style.height = Math.min(elements.chatTextarea.scrollHeight, 160) + "px";
  });

  elements.chatTextarea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // Topbar model selector
  elements.modelSelector.addEventListener("change", (e) => {
    const selectedMode = e.target.value;
    engine.saveConfig({ engineMode: selectedMode });
    updateEngineBadge();
  });

  // Welcome screen starter cards
  const starterCards = document.querySelectorAll(".prompt-card");
  starterCards.forEach(card => {
    card.addEventListener("click", () => {
      const prompt = card.getAttribute("data-prompt");
      if (prompt) submitQuery(prompt);
    });
  });

  // Modals
  elements.btnSettings.addEventListener("click", openSettingsModal);
  elements.btnCloseSettings.addEventListener("click", closeSettingsModal);
  elements.btnSaveSettings.addEventListener("click", saveSettingsModal);

  elements.btnLibrary.addEventListener("click", () => elements.libraryModal.classList.add("open"));
  elements.btnCloseLibrary.addEventListener("click", () => elements.libraryModal.classList.remove("open"));

  // Close modals on backdrop click
  elements.settingsModal.addEventListener("click", (e) => {
    if (e.target === elements.settingsModal) closeSettingsModal();
  });
  elements.libraryModal.addEventListener("click", (e) => {
    if (e.target === elements.libraryModal) elements.libraryModal.classList.remove("open");
  });
}

// --- SETTINGS MODAL ---
function openSettingsModal() {
  syncSettingsInputs();
  elements.settingsModal.classList.add("open");
}

function closeSettingsModal() {
  elements.settingsModal.classList.remove("open");
}

function syncSettingsInputs() {
  elements.inputEngineMode.value = engine.config.engineMode;
  elements.inputGeminiKey.value = engine.config.geminiApiKey || "";
  elements.inputGeminiModel.value = engine.config.geminiModel || "gemini-1.5-flash";
  elements.inputOpenaiKey.value = engine.config.openaiApiKey || "";
  elements.inputOpenaiModel.value = engine.config.openaiModel || "gpt-4o-mini";
  elements.inputToneStyle.value = engine.config.toneStyle || "gentle";
  elements.inputStreamingSpeed.value = engine.config.streamingSpeed || 20;
  elements.modelSelector.value = engine.config.engineMode;
  updateEngineBadge();
}

function saveSettingsModal() {
  const newConfig = {
    engineMode: elements.inputEngineMode.value,
    geminiApiKey: elements.inputGeminiKey.value.trim(),
    geminiModel: elements.inputGeminiModel.value,
    openaiApiKey: elements.inputOpenaiKey.value.trim(),
    openaiModel: elements.inputOpenaiModel.value,
    toneStyle: elements.inputToneStyle.value,
    streamingSpeed: parseInt(elements.inputStreamingSpeed.value, 10) || 20
  };
  engine.saveConfig(newConfig);
  elements.modelSelector.value = newConfig.engineMode;
  updateEngineBadge();
  closeSettingsModal();
}

function updateEngineBadge() {
  const mode = engine.config.engineMode;
  if (mode === "gemini") {
    elements.activeEngineLabel.textContent = "Gemini Flash (Live)";
  } else if (mode === "openai") {
    elements.activeEngineLabel.textContent = "GPT-4o Mini (Live)";
  } else {
    elements.activeEngineLabel.textContent = "EcoSphere Offline AI (Active)";
  }
}

// --- KNOWLEDGE LIBRARY MODAL ---
function populateLibraryModal() {
  elements.libraryList.innerHTML = "";
  ECO_KNOWLEDGE_BASE.topics.forEach(topic => {
    const item = document.createElement("div");
    item.className = "knowledge-item";
    item.innerHTML = `
      <span class="knowledge-badge">${escapeHtml(topic.category)}</span>
      <div class="knowledge-title">${escapeHtml(topic.title)}</div>
      <div class="knowledge-desc">${escapeHtml(topic.summary)}</div>
    `;
    item.addEventListener("click", () => {
      elements.libraryModal.classList.remove("open");
      submitQuery(`Can you gently explain: ${topic.title}?`);
    });
    elements.libraryList.appendChild(item);
  });
}
