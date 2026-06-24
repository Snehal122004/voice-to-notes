const API_KEY = "YOUR_API_KEY_HERE";
let recognition = null;
let isRecording = false;
let timerInterval = null;
let seconds = 0;
let currentMode = "notes";
let fullTranscript = "";

// ─── Speech Recognition Setup ───────────────────────────
function setupSpeech() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    document.getElementById('micStatus').textContent = "❌ Please open in Chrome or Edge for speech support";
    document.getElementById('micBtn').disabled = true;
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-IN';

  recognition.onresult = (event) => {
    let interimText = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const t = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        fullTranscript += t + " ";
      } else {
        interimText = t;
      }
    }
    const box = document.getElementById('transcriptBox');
    box.value = fullTranscript + interimText;
    updateWordCount();
  };

  recognition.onerror = (e) => {
    document.getElementById('micStatus').textContent = "⚠️ Please allow microphone access in your browser";
    stopRecording();
  };

  recognition.onend = () => {
    if (isRecording) recognition.start();
  };
}

// ─── Toggle Recording ────────────────────────────────────
function toggleRecording() {
  if (!recognition) { setupSpeech(); }
  isRecording ? stopRecording() : startRecording();
}

function startRecording() {
  fullTranscript = document.getElementById('transcriptBox').value;
  recognition.start();
  isRecording = true;

  document.getElementById('micBtn').classList.add('recording');
  document.getElementById('micIcon').textContent = "⏹️";
  document.getElementById('micStatus').textContent = "🔴 Recording... speak now!";
  document.getElementById('timer').classList.remove('hidden');

  seconds = 0;
  timerInterval = setInterval(() => {
    seconds++;
    document.getElementById('timerCount').textContent = seconds;
  }, 1000);
}

function stopRecording() {
  if (recognition) recognition.stop();
  isRecording = false;

  document.getElementById('micBtn').classList.remove('recording');
  document.getElementById('micIcon').textContent = "🎙️";
  document.getElementById('micStatus').textContent = "✅ Recording stopped. Ready to generate!";
  document.getElementById('timer').classList.add('hidden');
  clearInterval(timerInterval);
}

// ─── Word Count ──────────────────────────────────────────
function updateWordCount() {
  const text = document.getElementById('transcriptBox').value.trim();
  const count = text ? text.split(/\s+/).length : 0;
  document.getElementById('wordCount').textContent = `${count} words`;
}

document.getElementById('transcriptBox').addEventListener('input', updateWordCount);

// ─── Language Change ─────────────────────────────────────
function changeLanguage(lang) {
  if (recognition) {
    recognition.lang = lang;
  }
}

// ─── Mode Selection ──────────────────────────────────────
function setMode(mode) {
  currentMode = mode;
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`mode-${mode}`).classList.add('active');
}

// ─── Generate Output (Groq API) ──────────────────────────
async function generateOutput() {
  const text = document.getElementById('transcriptBox').value.trim();
  if (!text || text.length < 20) {
    alert("Please speak or paste some text first! Minimum 20 characters required.");
    return;
  }

  const prompts = {
    notes: `You are a smart study assistant. Convert this lecture transcript into well-structured study notes.
Use clear headings, bullet points, and highlight key terms.
Make it easy to revise quickly:

TRANSCRIPT:
${text}`,

    summary: `Summarize this lecture transcript into 5-7 key takeaways.
Each point should be concise and capture the most important idea.
Start each point with a relevant emoji:

TRANSCRIPT:
${text}`,

    quiz: `Create 5 multiple choice questions (MCQs) from this lecture transcript.
Format each as:
Q1. [Question]
A) Option  B) Option  C) Option  D) Option
✅ Answer: [correct option]

TRANSCRIPT:
${text}`,

    flash: `Create 8 flashcards from this lecture transcript.
Format each as:
🃏 Q: [concept or question]
   A: [clear, concise answer]

TRANSCRIPT:
${text}`
  };

  const titles = {
    notes: "📝 Study Notes",
    summary: "📌 Key Takeaways",
    quiz: "🧠 Practice Quiz",
    flash: "🃏 Flashcards"
  };

  const btn = document.getElementById('generateBtn');
  const outputCard = document.getElementById('outputCard');
  const outputContent = document.getElementById('outputContent');

  btn.disabled = true;
  btn.textContent = "✨ Generating...";
  outputCard.classList.remove('hidden');
  document.getElementById('outputTitle').textContent = titles[currentMode];
  outputContent.innerHTML = '<div class="loading-pulse">🤖 AI is creating your ' + titles[currentMode] + '...</div>';

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: prompts[currentMode]
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (data.choices && data.choices[0]) {
      outputContent.textContent = data.choices[0].message.content;
    } else {
      outputContent.textContent = "❌ Error: " + JSON.stringify(data);
    }

  } catch (err) {
    outputContent.textContent = "❌ Error: " + err.message + "\n\nPlease check your API key!";
  }

  btn.disabled = false;
  btn.textContent = "✨ Generate Now";
}

// ─── Copy Output ─────────────────────────────────────────
function copyOutput() {
  const text = document.getElementById('outputContent').textContent;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.querySelector('.copy-btn');
    btn.textContent = "✅ Copied!";
    setTimeout(() => btn.textContent = "📋 Copy", 2000);
  });
}

// ─── Init ─────────────────────────────────────────────────
setupSpeech();