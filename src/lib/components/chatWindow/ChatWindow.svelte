<script>
  import { onMount, tick } from "svelte";
  import { userData } from "$lib/store/user.svelte";

  let { task } = $props();

  let messages = $state([]);
  let newMessage = $state("");
  let isChatOpen = $state(false);
  let isTyping = $state(false);
  let isWaitingForAI = $state(false);

  function formatMessage(text) {
    if (!text) return "";

    // First process bold and italic
    text = text
      .replace("\\\\frac", "\\frac")
      .replace(
        /\*\*(.*?)\*\*/g,
        '<strong style="font-weight: 1400;">$1</strong>',
      )
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`/g, "");

    // Then process new lines and lists
    return text
      .split("\n")
      .map((line) => {
        const safeLine = line;
        // Format lists (e.g., "1." or "•")
        if (/^\s*(\d+\.|\-|\*|\•)\s+/.test(safeLine)) {
          return `<div style="margin-left: 10px;">${safeLine}</div>`;
        }
        return safeLine;
      })
      .join("<br>");
  }

  async function addMessage() {
    if (newMessage.trim() === "") return;

    messages = [
      ...messages,
      {
        id: Date.now(),
        avatarUrl: userData.user.photoURL,
        nickName: userData.user.displayName,
        messages: [newMessage],
        type: "me",
      },
    ];

    const messageToSend = newMessage;
    newMessage = "";
    isTyping = true;
    isWaitingForAI = true;

    setTimeout(async () => {
      await addAIResponse(messageToSend);
      isTyping = false;
      isWaitingForAI = false;
    }, 1000);
  }

  async function addAIResponse(userQuestion) {
    try {
      const conversationHistory = messages
        .slice(0, -1)
        .map((msg) => {
          const role = msg.type === "me" ? "Student" : "AI Assistant";
          const content = msg.messages.join("\n");
          return `${role}: ${content}`;
        })
        .join("\n\n");

      const systemPrompt = `You are MatMat AI Assistant, a mathematics expert. A student has sent you a task and has a question about the solution.
        Please answer their question and keep the response as brief as possible unless the student requests otherwise.
        The task and solution are written in LaTeX (MathJax). This is the conversation history:

        ${conversationHistory}

        Task and solution:
        ${JSON.stringify(task, null, 2)}

        Student's new question: ${userQuestion}

        Answer clearly and simply, taking into account the entire conversation context. When responding with mathematical equations, 
        use LaTeX format with \\( and \\) for inline mathematical expressions. Do not use single dollar signs 
        $ for mathematical expressions, but you can use double dollar signs $$ $$.`;

      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": "AIzaSyDnga8rJ1XkUvSDxTPvmG3FGRq8jXHxPnM",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: systemPrompt,
                  },
                ],
              },
            ],
          }),
        },
      );

      const data = await response.json();

      const aiResponse =
        data.candidates[0].content.parts.map((p) => p.text).join("\n") ||
        "No response.";

      messages = [
        ...messages,
        {
          id: Date.now() + 1,
          avatarUrl: "/images/AIAvatar.png",
          nickName: "MatMat AI Assistant",
          messages: [aiResponse],
          type: "ai",
        },
      ];
    } catch (error) {
      console.error("Error fetching AI response:", error);

      messages = [
        ...messages,
        {
          id: Date.now() + 1,
          avatarUrl: "/images/AIAvatar.png",
          nickName: "MatMat AI Assistant",
          messages: [
            "Sorry, there was an error processing your request. Please try again.",
          ],
          type: "ai",
        },
      ];
      isWaitingForAI = false;
    } finally {
      isTyping = false;
      isWaitingForAI = false;
    }
  }

  function handleKeyPress(event) {
    if (event.key === "Enter" && !event.shiftKey && !isWaitingForAI) {
      event.preventDefault();
      addMessage();
    }
  }

  function toggleChat() {
    isChatOpen = !isChatOpen;
  }

  function closeChat() {
    isChatOpen = false;
  }

  // MathJax configuration
  onMount(() => {
    if (!window.MathJax) {
      const script = document.createElement("script");
      script.id = "MathJax-script";
      script.async = true;
      script.src =
        "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js";
      document.head.appendChild(script);

      window.MathJax = {
        tex: {
          inlineMath: [
            ["$", "$"],
            ["\\(", "\\)"],
          ],
          displayMath: [
            ["$$", "$$"],
            ["\\[", "\\]"],
          ],
          processEscapes: true,
        },
        options: {
          skipHtmlTags: ["script", "noscript", "style", "textarea", "pre"],
        },
      };
    }
  });

  $effect(() => {
    if (messages.length === 0) return;
    if (!isChatOpen) return;

    const processMathJax = async () => {
      await tick(); // Wait for DOM to update

      if (window.MathJax?.typesetPromise) {
        const chatBoard = document.querySelector(".chat__conversation-board");
        if (chatBoard) {
          try {
            await window.MathJax.typesetPromise([chatBoard]);
          } catch (err) {
            console.error("MathJax typeset failed:", err);
          }
        }
      }
    };

    const smartScrollToBottom = () => {
      const chatBoard = document.querySelector(".chat__conversation-board");
      setTimeout(() => {
        chatBoard.scrollTop = chatBoard.scrollHeight;
      }, 100);
    };

    // Run with small delay
    setTimeout(() => {
      processMathJax();
      smartScrollToBottom();
    }, 50);
  });

  // Special effect for chat opening
  $effect(() => {
    if (isChatOpen && messages.length > 0) {
      setTimeout(async () => {
        await tick();

        if (window.MathJax?.typesetPromise) {
          const chatBoard = document.querySelector(".chat__conversation-board");
          if (chatBoard) {
            try {
              await window.MathJax.typesetPromise([chatBoard]);
            } catch (err) {
              console.error("MathJax typeset failed on chat open:", err);
            }
          }
        }
      }, 200);
    }
  });
</script>

<svelte:head>
  <link
    href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700;1400&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<!-- Floating Chat Button -->
<div class="floating-chat-button" on:click={toggleChat}>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
    ></path>
  </svg>
</div>

<!-- Chat Overlay -->
{#if isChatOpen}
  <div class="chat-overlay" on:click={closeChat}>
    <div class="chat-container" on:click|stopPropagation>
      <div class="chat-header">
        <h3>MatMat AI Assistant</h3>
        <button class="close-button" on:click={closeChat}>×</button>
      </div>

      <div id="chat">
        <div class="chat__conversation-board">
          {#each messages as message (message.id)}
            <div
              class="chat__conversation-board__message-container {message.type ===
              'me'
                ? 'reversed'
                : ''}"
            >
              <div class="chat__conversation-board__message__person">
                <div class="chat__conversation-board__message__person__avatar">
                  <img src={message.avatarUrl} alt={message.nickName} />
                </div>
                <span
                  class="chat__conversation-board__message__person__nickname"
                  >{message.nickName}</span
                >
              </div>
              <div class="chat__conversation-board__message__context">
                {#each message.messages as text}
                  <div class="chat__conversation-board__message__bubble">
                    <span>{@html formatMessage(text)}</span>
                  </div>
                {/each}
              </div>
            </div>
          {/each}
          <!-- Typing indicator -->
          {#if isTyping}
            <div class="chat__conversation-board__message-container">
              <div class="chat__conversation-board__message__person">
                <div class="chat__conversation-board__message__person__avatar">
                  <img src="/images/AIAvatar.png" alt="AI Assistant" />
                </div>
                <span
                  class="chat__conversation-board__message__person__nickname"
                  >MatMat AI Assistant</span
                >
              </div>
              <div class="chat__conversation-board__message__context">
                <div class="chat__conversation-board__message__bubble">
                  <div class="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            </div>
          {/if}
        </div>

        <div class="chat__conversation-panel">
          <div class="chat__conversation-panel__container">
            <input
              bind:value={newMessage}
              on:keypress={handleKeyPress}
              class="chat__conversation-panel__input panel-item"
              class:disabled={isWaitingForAI}
              placeholder="Ask anything"
              disabled={isWaitingForAI}
            />

            <button
              on:click={addMessage}
              class="chat__conversation-panel__button panel-item btn-icon send-message-button"
              class:disabled={isWaitingForAI}
              disabled={isWaitingForAI}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  /* === FLOATING CHAT BUTTON === */
  .floating-chat-button {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: var(--primary);
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    transition: transform 0.3s ease;
  }

  .floating-chat-button:hover {
    transform: scale(1.1);
  }

  .floating-chat-button svg {
    stroke: var(--primary-foreground);
    width: 24px;
    height: 24px;
  }

  /* === CHAT OVERLAY === */
  .chat-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1001;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .chat-container {
    width: 90%;
    max-width: 690px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
  }

  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 15px;
    background: var(--card);
    border-top-left-radius: var(--radius);
    border-top-right-radius: var(--radius);
    border-bottom: 1px solid var(--border);
  }

  .chat-header h3 {
    margin: 0;
    color: var(--card-foreground);
    font-size: 14px;
    font-weight: 600;
  }

  .close-button {
    background: none;
    border: none;
    color: var(--muted-foreground);
    font-size: 20px;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-button:hover {
    color: var(--foreground);
  }

  /* === CHAT WRAPPER === */
  #chat {
    background: var(--background);
    box-sizing: border-box;
    padding: 1em;
    border-bottom-left-radius: var(--radius);
    border-bottom-right-radius: var(--radius);
    position: relative;
    overflow: hidden;
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  /* === BUTTON ICON === */
  #chat .btn-icon {
    position: relative;
    cursor: pointer;
  }

  #chat .btn-icon svg {
    stroke: var(--foreground);
    fill: var(--foreground);
    width: 50%;
    height: auto;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  /* DISABLED ELEMENTS STYLE */
  .chat__conversation-panel__input.disabled,
  .chat__conversation-panel__input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .send-message-button.disabled,
  .send-message-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
  }

  .send-message-button.disabled:hover,
  .send-message-button:disabled:hover {
    background: var(--primary);
    opacity: 0.6;
    transform: none !important;
  }

  /* === CHAT CONVERSATION === */
  .chat__conversation-board {
    padding: 1em 0 2em;
    overflow: auto;
    flex: 1;
  }

  /* REVERSED MESSAGES (User messages) */
  .chat__conversation-board__message-container.reversed {
    flex-direction: row-reverse;
  }

  .chat__conversation-board__message-container.reversed
    .chat__conversation-board__message__person {
    margin: 0 0 0 1.2em;
  }

  /* MESSAGE CONTAINER */
  .chat__conversation-board__message-container {
    position: relative;
    display: flex;
    flex-direction: row;
  }

  .chat__conversation-board__message-container:not(:last-child) {
    margin: 0 0 2em 0;
  }

  /* PERSON (AVATAR + NAME) */
  .chat__conversation-board__message__person {
    text-align: center;
    margin: 0 1.2em 0 0;
  }

  .chat__conversation-board__message__person__avatar {
    height: 35px;
    width: 35px;
    overflow: hidden;
    border-radius: 50%;
    user-select: none;
    position: relative;
    border: 2px solid var(--border);
  }

  .chat__conversation-board__message__person__avatar img {
    height: 100%;
    width: auto;
  }

  .chat__conversation-board__message__person__nickname {
    font-size: 9px;
    color: var(--muted-foreground);
    user-select: none;
    display: none;
  }

  /* MESSAGE CONTEXT */
  .chat__conversation-board__message__context {
    max-width: 75%;
    align-self: flex-end;
  }

  /* MESSAGE BUBBLE */
  .chat__conversation-board__message__bubble span {
    width: fit-content;
    display: inline-table;
    word-wrap: break-word;
    background: var(--muted);
    font-size: 13px;
    color: var(--accent-foreground);
    padding: 0.5em 0.8em;
    white-space: pre-wrap;
    line-height: 1.5;
    border-radius: var(--radius);
    font-family: "Lato", sans-serif;
    border: 1px solid var(--border);
  }

  .chat__conversation-board__message__bubble span br {
    display: block;
    content: "";
    margin-bottom: 0.3em;
  }

  /* User message bubble styling */
  .chat__conversation-board__message-container.reversed
    .chat__conversation-board__message__bubble
    span {
    background: var(--primary);
    color: var(--primary-foreground);
    border-color: var(--primary);
  }

  .chat__conversation-board__message__bubble:not(:last-child) {
    margin: 0 0 0.3em;
  }

  /* CONVERSATION PANEL */
  .chat__conversation-panel {
    background: var(--card);
    border-radius: var(--radius);
    padding: 0 1em;
    height: 55px;
    margin: 0.5em 0 0;
    border: 1px solid var(--border);
  }

  .chat__conversation-panel__container {
    display: flex;
    flex-direction: row;
    align-items: center;
    height: 100%;
  }

  .chat__conversation-panel__container .panel-item:not(:last-child) {
    margin: 0 1em 0 0;
  }

  /* PANEL BUTTONS */
  .chat__conversation-panel__button {
    background: transparent;
    height: 20px;
    width: 30px;
    border: 0;
    padding: 0;
    outline: none;
    cursor: pointer;
  }

  .chat__conversation-panel .send-message-button {
    background: var(--primary);
    height: 30px;
    margin: 10px 0;
    min-width: 30px;
    border-radius: 50%;
    transition: 0.3s ease;
  }

  .chat__conversation-panel .send-message-button:hover {
    background: var(--primary);
    opacity: 0.9;
  }

  .chat__conversation-panel .send-message-button:active {
    transform: scale(0.97);
  }

  .chat__conversation-panel .send-message-button svg {
    margin: 1px -1px;
    stroke: var(--primary-foreground);
  }

  /* INPUT FIELD */
  .chat__conversation-panel__input {
    width: 100%;
    height: 100%;
    outline: none;
    position: relative;
    color: var(--foreground);
    font-size: 13px;
    background: transparent;
    border: 0;
    font-family: "Lato", sans-serif;
    resize: none;
  }

  .chat__conversation-panel__input::placeholder {
    color: var(--muted-foreground);
  }

  /* === RESPONSIVE === */
  @media only screen and (max-width: 600px) {
    .chat-container {
      width: 95%;
      height: 95vh;
    }
  }

  /* MATH FORMULA STYLE */
  .mjx-chtml {
    outline: none;
  }

  .MathJax {
    font-size: 1.1em !important;
  }

  /* Typing indicator styles */
  .typing-indicator {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 0;
    line-height: 1;
  }

  .typing-indicator span {
    width: 4px;
    aspect-ratio: 1 / 1;
    border-radius: 50%;
    background-color: var(--muted-foreground);
    display: block;
    animation: typing 1.4s infinite ease-in-out both;
  }

  .typing-indicator span:nth-child(1) {
    animation-delay: -0.32s;
  }

  .typing-indicator span:nth-child(2) {
    animation-delay: -0.16s;
  }

  @keyframes typing {
    0%,
    80%,
    100% {
      transform: scale(0.8);
      opacity: 0.5;
    }
    40% {
      transform: scale(1);
      opacity: 1;
    }
  }

  .chat__conversation-board__message__bubble .typing-indicator {
    margin: 4px 0;
  }
</style>
