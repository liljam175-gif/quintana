/* ==========================================================================
   Extra features for Catie's site.
   Loaded after the main inline script, so the DOM is ready and the
   Apple-emoji observer is already running.
   ========================================================================== */
(() => {
  "use strict";

  const SITE = window.SITE_CONTENT && typeof window.SITE_CONTENT === "object"
    ? window.SITE_CONTENT
    : {};

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const store = {
    get(key, fallback = null) {
      try {
        const value = window.localStorage.getItem(key);
        return value === null ? fallback : value;
      } catch (error) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem(key, String(value));
      } catch (error) {
        /* private mode / storage full */
      }
    },
    remove(key) {
      try {
        window.localStorage.removeItem(key);
      } catch (error) {
        /* ignore */
      }
    }
  };

  function asArray(value, fallback) {
    return Array.isArray(value) && value.length ? value : fallback;
  }

  function randomIndex(length, avoid) {
    if (length <= 1) return 0;
    let index = Math.floor(Math.random() * length);
    let guard = 0;
    while (index === avoid && guard < 20) {
      index = Math.floor(Math.random() * length);
      guard += 1;
    }
    return index;
  }

  function shuffle(list) {
    const array = [...list];
    for (let i = array.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  let toastTimer = null;
  function toast(message, isBad) {
    let el = document.getElementById("siteToast");
    if (!el) {
      el = document.createElement("div");
      el.id = "siteToast";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      Object.assign(el.style, {
        position: "fixed",
        left: "50%",
        bottom: "86px",
        zIndex: "95",
        maxWidth: "min(460px, calc(100vw - 2rem))",
        padding: "0.72rem 1.1rem",
        borderRadius: "14px",
        background: "#3d2030",
        color: "#fff",
        fontSize: "0.82rem",
        fontWeight: "600",
        lineHeight: "1.4",
        textAlign: "center",
        boxShadow: "0 18px 40px -18px rgba(0, 0, 0, 0.55)",
        transform: "translateX(-50%)",
        transition: "opacity 0.3s ease",
        pointerEvents: "none"
      });
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.style.background = isBad ? "#8f1f43" : "#3d2030";
    el.style.opacity = "1";
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      el.style.opacity = "0";
    }, 3200);
  }

  /* ======================================================================
     1. ROTATING NOTES — a new message appears after the last one is read
     ====================================================================== */

  const notes = asArray(SITE.notes, [
    "You're the best thing I didn't see coming.",
    "I hope your day is as soft as you are with me.",
    "If you're tired, come here. I'll be the quiet.",
    "I'd pick you. In every version of this life."
  ]);

  const NOTE_INDEX_KEY = "cq-note-index-v2";
  const NOTE_SEEN_KEY = "cq-note-seen-v2-";
  let noteIndex = Number(store.get(NOTE_INDEX_KEY, 0)) || 0;
  noteIndex = ((noteIndex % notes.length) + notes.length) % notes.length;

  const noteText = $("#noteText");
  const noteCount = $("#noteCount");
  const nextNoteBtn = $("#nextNote");

  function allNotesSeen() {
    return notes.every((_, index) => store.get(NOTE_SEEN_KEY + index) === "1");
  }

  function renderNote() {
    if (!noteText) return;
    noteText.textContent = notes[noteIndex];
    if (noteCount) {
      noteCount.textContent = `Note ${noteIndex + 1} of ${notes.length}`;
    }
  }

  function advanceNote() {
    store.set(NOTE_SEEN_KEY + noteIndex, "1");
    noteIndex = (noteIndex + 1) % notes.length;
    store.set(NOTE_INDEX_KEY, noteIndex);
    renderNote();
  }

  if (notes.length && noteText) {
    if (allNotesSeen()) {
      notes.forEach((_, index) => store.remove(NOTE_SEEN_KEY + index));
    }

    // If the note currently stored was already read, move to the next unread one.
    let guard = 0;
    while (store.get(NOTE_SEEN_KEY + noteIndex) === "1" && guard < notes.length) {
      noteIndex = (noteIndex + 1) % notes.length;
      guard += 1;
    }
    store.set(NOTE_INDEX_KEY, noteIndex);
    renderNote();

    const markNoteSeen = () => store.set(NOTE_SEEN_KEY + noteIndex, "1");
    const noteCard = $("#noteCard");
    if (noteCard && "IntersectionObserver" in window) {
      const noteObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              window.setTimeout(markNoteSeen, 3500);
              noteObserver.disconnect();
            }
          });
        },
        { threshold: 0.45 }
      );
      noteObserver.observe(noteCard);
    } else {
      window.setTimeout(markNoteSeen, 4000);
    }
  }

  nextNoteBtn?.addEventListener("click", () => {
    advanceNote();
    toast("Next note unlocked.");
  });

  /* ======================================================================
     2. ROTATING LETTERS — a new letter after the last one is opened
     ====================================================================== */

  const letters = [];
  if (SITE.letter && typeof SITE.letter === "object") letters.push(SITE.letter);
  if (Array.isArray(SITE.letters)) {
    SITE.letters.forEach((letter) => {
      if (letter && typeof letter === "object") letters.push(letter);
    });
  }

  const LETTER_INDEX_KEY = "cq-letter-index-v2";
  const LETTER_SEEN_KEY = "cq-letter-seen-v2-";
  let letterIndex = Number(store.get(LETTER_INDEX_KEY, 0)) || 0;
  letterIndex = ((letterIndex % Math.max(letters.length, 1)) + Math.max(letters.length, 1)) % Math.max(letters.length, 1);

  const letterSalutation = $("#letterSalutation");
  const letterParagraphs = $("#letterParagraphs");
  const letterSignature = $("#letterSignature");
  const letterPostscript = $("#letterPostscript");
  const letterProgress = $("#letterProgress");
  const sealProgress = $("#sealProgress");
  const letterCard = $("#letterCard");
  const seal = $("#seal");
  const nextLetterBtn = $("#nextLetter");

  function renderLetter() {
    if (!letters.length) return;
    const letter = letters[letterIndex] || letters[0];
    if (letterSalutation) letterSalutation.textContent = letter.salutation || "Dearest Catie,";
    if (letterParagraphs) {
      letterParagraphs.innerHTML = "";
      const paragraphs = Array.isArray(letter.paragraphs) ? letter.paragraphs : [];
      paragraphs.forEach((text) => {
        const p = document.createElement("p");
        p.textContent = text;
        letterParagraphs.appendChild(p);
      });
    }
    if (letterSignature) letterSignature.textContent = letter.signature || "Yours, always. 💌";
    if (letterPostscript) letterPostscript.textContent = letter.postscript || "";
    const label = `Letter ${letterIndex + 1} of ${letters.length}`;
    if (letterProgress) letterProgress.textContent = label;
    if (sealProgress) sealProgress.textContent = label;
  }

  function allLettersSeen() {
    return letters.every((_, index) => store.get(LETTER_SEEN_KEY + index) === "1");
  }

  function markLetterSeen() {
    store.set(LETTER_SEEN_KEY + letterIndex, "1");
    store.set(LETTER_INDEX_KEY, (letterIndex + 1) % letters.length);
  }

  function showNextLetter() {
    markLetterSeen();
    letterIndex = (letterIndex + 1) % letters.length;
    store.set(LETTER_INDEX_KEY, letterIndex);
    renderLetter();
    if (letterCard) {
      letterCard.classList.remove("opened");
      const body = $("#letterBody");
      if (body) body.setAttribute("aria-hidden", "true");
      window.setTimeout(() => {
        letterCard.classList.add("opened");
        if (body) body.setAttribute("aria-hidden", "false");
        letterCard.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 120);
    }
  }

  if (letters.length) {
    if (allLettersSeen()) {
      letters.forEach((_, index) => store.remove(LETTER_SEEN_KEY + index));
    }
    let guard = 0;
    while (store.get(LETTER_SEEN_KEY + letterIndex) === "1" && guard < letters.length) {
      letterIndex = (letterIndex + 1) % letters.length;
      guard += 1;
    }
    store.set(LETTER_INDEX_KEY, letterIndex);
    renderLetter();
  }

  seal?.addEventListener("click", () => {
    window.setTimeout(markLetterSeen, 300);
  });

  nextLetterBtn?.addEventListener("click", () => {
    showNextLetter();
    toast("A new letter just for you.");
  });

  /* ======================================================================
     3. MUSIC PLAYER — plays only the songs you added in the admin (music/).
        If no song has been added yet, the player stays hidden.
     ====================================================================== */

  const tracks = Array.isArray(SITE.music && SITE.music.tracks)
    ? SITE.music.tracks.filter((track) => track && track.src)
    : [];
  const musicPlayer = $("#musicPlayer");
  const mpTitle = $("#mpTitle");
  const mpStatus = $("#mpStatus");
  const mpToggle = $("#mpToggle");
  const mpPrev = $("#mpPrev");
  const mpNext = $("#mpNext");
  const mpMute = $("#mpMute");

  const openingTrack = SITE.music && SITE.music.opening
    ? String(SITE.music.opening)
    : "";
  let openingIndex = -1;
  if (openingTrack) {
    openingIndex = tracks.findIndex(
      (track) => track && (track.src === openingTrack || track.title === openingTrack)
    );
  }
  let musicIndex = openingIndex >= 0
    ? openingIndex
    : Number(store.get("cq-music-index-v2", 0)) || 0;
  if (tracks.length) {
    musicIndex = ((musicIndex % tracks.length) + tracks.length) % tracks.length;
  }
  let musicGestureArmed = false;
  let musicAudio = null;

  function getTrackUrl(index) {
    const track = tracks[index] || tracks[0];
    return track && track.src ? track.src : "";
  }

  function updateMusicUI(mode) {
    const track = tracks[musicIndex] || { title: "Music", artist: "" };
    if (mpTitle) mpTitle.textContent = track.title || "Untitled";
    const artist = track.artist ? `${track.artist} · ` : "";
    if (mpStatus) {
      if (mode === "playing") mpStatus.textContent = `${artist}playing`;
      else if (mode === "paused") mpStatus.textContent = `${artist}paused`;
      else if (mode === "blocked") mpStatus.textContent = "tap to play";
      else if (mode === "loading") mpStatus.textContent = "loading…";
      else mpStatus.textContent = `${artist}ready`;
    }
    if (musicPlayer) {
      musicPlayer.classList.toggle("playing", mode === "playing");
      musicPlayer.classList.toggle("is-blocked", mode === "blocked");
    }
  }

  function armMusicGesture() {
    if (musicGestureArmed) return;
    musicGestureArmed = true;
    const start = () => {
      document.removeEventListener("pointerdown", start);
      musicGestureArmed = false;
      playMusic();
    };
    document.addEventListener("pointerdown", start);
  }

  function playMusic() {
    if (!musicAudio) return;
    const promise = musicAudio.play();
    if (promise && typeof promise.then === "function") {
      promise
        .then(() => updateMusicUI("playing"))
        .catch(() => {
          updateMusicUI("blocked");
          armMusicGesture();
        });
    } else {
      updateMusicUI("playing");
    }
  }

  function loadMusic(index, shouldPlay) {
    if (!musicAudio || !tracks.length) return;
    musicIndex = ((index % tracks.length) + tracks.length) % tracks.length;
    store.set("cq-music-index-v2", musicIndex);
    updateMusicUI("loading");
    try {
      const url = getTrackUrl(musicIndex);
      if (!url) return;
      if (musicAudio.src !== url) musicAudio.src = url;
      musicAudio.currentTime = 0;
      if (shouldPlay) playMusic();
      else updateMusicUI("paused");
    } catch (error) {
      updateMusicUI("blocked");
      toast("Music could not start. Tap play to try again.", true);
    }
  }

  if (musicPlayer && tracks.length) {
    musicPlayer.hidden = false;
    musicAudio = new Audio();
    musicAudio.preload = "auto";
    musicAudio.volume = 0.5;
    musicAudio.muted = store.get("cq-music-muted-v2", "0") === "1";

    musicPlayer.classList.toggle("muted", musicAudio.muted);

    musicAudio.addEventListener("ended", () => loadMusic(musicIndex + 1, true));
    musicAudio.addEventListener("error", () => {
      if (musicAudio && musicAudio.src) {
        toast("That track could not play. Try the next one.", true);
        updateMusicUI("blocked");
      }
    });

    mpToggle?.addEventListener("click", () => {
      if (musicAudio.paused) playMusic();
      else {
        musicAudio.pause();
        updateMusicUI("paused");
      }
    });

    mpPrev?.addEventListener("click", () => loadMusic(musicIndex - 1, true));
    mpNext?.addEventListener("click", () => loadMusic(musicIndex + 1, true));

    mpMute?.addEventListener("click", () => {
      musicAudio.muted = !musicAudio.muted;
      store.set("cq-music-muted-v2", musicAudio.muted ? "1" : "0");
      musicPlayer.classList.toggle("muted", musicAudio.muted);
    });

    const autoplay = !(SITE.music && SITE.music.autoplay === false);
    window.setTimeout(() => {
      loadMusic(musicIndex, autoplay);
      if (!autoplay) updateMusicUI("ready");
    }, 350);
  } else if (musicPlayer) {
    musicPlayer.hidden = true;
  }

  /* ======================================================================
     4. PLAY TOGETHER — truth & dare, audition, dance, couples trivia
     ====================================================================== */

  const truths = asArray(SITE.truths, [
    "When did you first realize you liked me?",
    "What's your favorite memory of us so far?",
    "What's something you've wanted to tell me but haven't?",
    "When do you feel closest to me?"
  ]);

  const dares = asArray(SITE.dares, [
    "Send me a voice note saying the first thing that comes to your mind about me.",
    "Give me your best flirty compliment. No laughing.",
    "Tell me one thing you want to do to me on our next date.",
    "Say my name in the most dramatic voice you can manage."
  ]);

  const auditionPrompts = asArray(SITE.audition, [
    "Audition for the role of my favorite person. Give me your best opening line.",
    "Serenade me. It can be one line. It must be sincere.",
    "Give me a compliment so specific it makes me blush.",
    "Say something romantic using only five words."
  ]);

  const danceMoves = asArray(SITE.danceMoves, [
    "Slow sway. No music needed.",
    "The kitchen spin. End with a dip.",
    "Freestyle for 15 seconds. Commit.",
    "Slow dance, foreheads together."
  ]);

  const triviaQuestions = asArray(SITE.couplesTrivia, [
    {
      question: "What's my love language?",
      options: ["Gifts", "Words", "Time", "Touch"],
      answer: "Time",
      note: "Specifically: your time, undivided, no phone."
    },
    {
      question: "What's our ideal night in?",
      options: ["Something fancy", "Takeout and a movie", "Music and talking", "All of it, slowly"],
      answer: "All of it, slowly",
      note: "No rush. That's the whole point."
    }
  ]);

  const tdPrompt = $("#tdPrompt");
  const tdCount = $("#tdCount");
  const tdNote = $("#tdNote");
  let tdRounds = 0;
  let lastTruth = -1;
  let lastDare = -1;

  function showTruth() {
    const index = randomIndex(truths.length, lastTruth);
    lastTruth = index;
    tdRounds += 1;
    if (tdPrompt) tdPrompt.textContent = truths[index];
    if (tdCount) tdCount.textContent = `${tdRounds} round${tdRounds === 1 ? "" : "s"} played`;
    if (tdNote) tdNote.textContent = "Truth. No lying.";
  }

  function showDare() {
    const index = randomIndex(dares.length, lastDare);
    lastDare = index;
    tdRounds += 1;
    if (tdPrompt) tdPrompt.textContent = dares[index];
    if (tdCount) tdCount.textContent = `${tdRounds} round${tdRounds === 1 ? "" : "s"} played`;
    if (tdNote) tdNote.textContent = "Dare. You have to do it.";
  }

  $("#truthBtn")?.addEventListener("click", showTruth);
  $("#dareBtn")?.addEventListener("click", showDare);

  const auditionPrompt = $("#auditionPrompt");
  const auditionRounds = $("#auditionRounds");
  const auditionVerdict = $("#auditionVerdict");
  const verdicts = [
    "Casting now.",
    "Strong choice.",
    "I'm listening.",
    "You had me at hello.",
    "Callback material.",
    "Okay, you're hired.",
    "That was unfairly charming."
  ];
  let auditionRound = 0;
  let lastAudition = -1;

  $("#auditionBtn")?.addEventListener("click", () => {
    const index = randomIndex(auditionPrompts.length, lastAudition);
    lastAudition = index;
    auditionRound += 1;
    if (auditionPrompt) auditionPrompt.textContent = auditionPrompts[index];
    if (auditionRounds) auditionRounds.textContent = `Rounds: ${auditionRound}`;
    if (auditionVerdict) auditionVerdict.textContent = verdicts[Math.floor(Math.random() * verdicts.length)];
  });

  const dancePrompt = $("#dancePrompt");
  const danceNote = $("#danceNote");
  const danceTimer = $("#danceTimer");
  const danceTimerBtn = $("#danceTimerBtn");
  let lastDance = -1;
  let danceInterval = null;

  $("#danceBtn")?.addEventListener("click", () => {
    const index = randomIndex(danceMoves.length, lastDance);
    lastDance = index;
    if (dancePrompt) dancePrompt.textContent = danceMoves[index];
    if (danceNote) danceNote.textContent = "Commit. I'm watching.";
  });

  function stopDanceTimer() {
    if (danceInterval) {
      window.clearInterval(danceInterval);
      danceInterval = null;
    }
    if (danceTimerBtn) {
      danceTimerBtn.disabled = false;
      danceTimerBtn.textContent = "Start 20s timer";
    }
  }

  danceTimerBtn?.addEventListener("click", () => {
    if (danceInterval) {
      stopDanceTimer();
      if (danceNote) danceNote.textContent = "Timer stopped. Try again.";
      return;
    }
    let remaining = 20;
    if (danceTimer) danceTimer.textContent = `${remaining.toFixed(1)}s`;
    if (danceNote) danceNote.textContent = "Go. Don't think about it.";
    if (danceTimerBtn) {
      danceTimerBtn.disabled = false;
      danceTimerBtn.textContent = "Stop timer";
    }

    danceInterval = window.setInterval(() => {
      remaining = Math.max(0, remaining - 0.1);
      if (danceTimer) danceTimer.textContent = `${remaining.toFixed(1)}s`;
      if (remaining <= 0) {
        stopDanceTimer();
        if (danceNote) danceNote.textContent = "Time. You're adorable.";
        if (danceTimer) danceTimer.textContent = "0.0s";
      }
    }, 100);
  });

  const triviaPrompt = $("#triviaPrompt");
  const triviaOptions = $("#triviaOptions");
  const triviaFeedback = $("#triviaFeedback");
  const triviaScore = $("#triviaScore");
  const triviaCount = $("#triviaCount");
  const triviaBtn = $("#triviaBtn");
  let triviaOrder = [];
  let triviaPosition = 0;
  let triviaScoreValue = 0;
  let triviaAnswered = false;

  function renderTriviaQuestion() {
    if (!triviaPrompt || !triviaOptions) return;
    if (triviaPosition >= triviaOrder.length) {
      triviaPrompt.textContent = `You scored ${triviaScoreValue} out of ${triviaOrder.length}. Not bad for someone I'm obsessed with.`;
      triviaOptions.innerHTML = "";
      if (triviaFeedback) triviaFeedback.textContent = "Play again? I'll pretend to be surprised.";
      if (triviaCount) triviaCount.textContent = "Round complete";
      if (triviaBtn) triviaBtn.textContent = "Play again";
      triviaAnswered = true;
      return;
    }

    const question = triviaQuestions[triviaOrder[triviaPosition]];
    triviaAnswered = false;
    if (triviaPrompt) triviaPrompt.textContent = question.question;
    if (triviaFeedback) triviaFeedback.textContent = "";
    if (triviaCount) {
      triviaCount.textContent = `Question ${triviaPosition + 1} of ${triviaOrder.length}`;
    }
    if (triviaScore) {
      triviaScore.textContent = `Score: ${triviaScoreValue} / ${triviaOrder.length}`;
    }
    if (triviaBtn) triviaBtn.textContent = "Next question";
    triviaOptions.innerHTML = "";

    question.options.forEach((option) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "trivia-option";
      button.textContent = option;
      button.addEventListener("click", () => answerTrivia(button, option, question));
      triviaOptions.appendChild(button);
    });
  }

  function answerTrivia(button, option, question) {
    if (triviaAnswered) return;
    triviaAnswered = true;
    const buttons = $$(".trivia-option", triviaOptions);
    buttons.forEach((item) => {
      item.disabled = true;
      if (item.textContent === question.answer) item.classList.add("correct");
    });
    if (option === question.answer) {
      triviaScoreValue += 1;
      button.classList.add("correct");
      if (triviaFeedback) triviaFeedback.textContent = question.note || "Correct. Obviously.";
    } else {
      button.classList.add("wrong");
      if (triviaFeedback) {
        triviaFeedback.textContent = `The answer is "${question.answer}". ${question.note || ""}`.trim();
      }
    }
    if (triviaScore) {
      triviaScore.textContent = `Score: ${triviaScoreValue} / ${triviaOrder.length}`;
    }
  }

  function startTrivia() {
    triviaOrder = shuffle([...Array(triviaQuestions.length).keys()]);
    triviaPosition = 0;
    triviaScoreValue = 0;
    triviaAnswered = false;
    renderTriviaQuestion();
  }

  triviaBtn?.addEventListener("click", () => {
    if (!triviaOrder.length) {
      startTrivia();
      return;
    }
    if (triviaPosition >= triviaOrder.length) {
      startTrivia();
      return;
    }
    triviaPosition += 1;
    renderTriviaQuestion();
  });

  /* ======================================================================
     5. LIVE CALL — private Jitsi room plus a Supabase nudge
     ====================================================================== */

  const ROOM_KEY = "cq-call-room-v2";
  const callService = (SITE.live && SITE.live.service) || "https://meet.jit.si/";
  const callStage = $("#callStage");
  const callNote = $("#callNote");
  const openCallBtn = $("#openCall");

  function makeRoomName() {
    const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
    let name = "";
    for (let i = 0; i < 8; i += 1) {
      name += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return `catie-and-me-${name}`;
  }

  function cleanRoom(value) {
    return String(value || "")
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .slice(0, 64);
  }

  function getRoomName() {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("call");
    let room =
      cleanRoom(fromUrl) ||
      cleanRoom(store.get(ROOM_KEY, "")) ||
      cleanRoom(SITE.live && SITE.live.room);
    if (!room) room = makeRoomName();
    store.set(ROOM_KEY, room);
    return room;
  }

  function roomUrl(room) {
    return `${callService}${encodeURIComponent(room)}`;
  }

  function startCall(roomOverride) {
    const room = cleanRoom(roomOverride) || getRoomName();
    store.set(ROOM_KEY, room);
    if (!callStage) return room;

    callStage.innerHTML = "";
    const iframe = document.createElement("iframe");
    iframe.src = `${roomUrl(room)}#config.prejoinPageEnabled=false&config.startWithAudioMuted=false`;
    iframe.title = "Private video call";
    iframe.allow = "camera; microphone; fullscreen; display-capture; autoplay";
    iframe.setAttribute("allowfullscreen", "");
    callStage.appendChild(iframe);
    if (openCallBtn) openCallBtn.hidden = false;
    if (callNote) {
      callNote.textContent = `Room: ${room} · press Notify me to send a private nudge.`;
    }
    return room;
  }

  async function sendNudge(kind) {
    const cloud = window.CQCloud;

    if (!cloud || !cloud.configured) {
      toast("Nudges need Supabase. Open SUPABASE-SETUP.md to connect it.");
      return false;
    }

    if (!cloud.currentUser()) {
      toast("Sign in to the private chat first, then nudge me 💌");
      document.getElementById("chat")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return false;
    }

    try {
      const room = getRoomName();
      await cloud.sendNotification({
        type: kind || "call",
        room,
        text:
          kind === "play"
            ? "wants to play a game with you."
            : "wants you on the live call."
      });
      toast("Nudge sent 💌");
      return true;
    } catch (error) {
      toast(cloud.friendlyError(error));
      return false;
    }
  }

  $("#startCall")?.addEventListener("click", () => {
    startCall();
    toast("Room open. Press Notify me to send a nudge.");
  });

  $("#notifyCall")?.addEventListener("click", () => {
    sendNudge("call");
  });

  openCallBtn?.addEventListener("click", () => {
    window.open(roomUrl(getRoomName()), "_blank", "noopener");
  });

  // A nudge banner or an old ?call= link can start the same room.
  window.addEventListener("cq:join-call", (event) => {
    const room = event.detail && event.detail.room;
    startCall(room);
    toast("Joining the call 💞");
    $("#live")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  if (new URLSearchParams(window.location.search).get("call")) {
    window.setTimeout(() => {
      startCall();
      toast("Call opened. The room is below.");
      $("#live")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 650);
  }

  /* ======================================================================
     6. VOICE RECORDER — MediaRecorder with playback, download, wall save
     ====================================================================== */

  const recBtn = $("#recBtn");
  const recStop = $("#recStop");
  const recStatus = $("#recStatus");
  const recList = $("#recList");
  let recorder = null;
  let recorderChunks = [];
  let recorderStream = null;

  async function startRecording() {
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      toast("Voice recording is not supported in this browser.", true);
      return;
    }
    try {
      recorderStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const candidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus"
      ];
      const mimeType = candidates.find(
        (type) => window.MediaRecorder.isTypeSupported && window.MediaRecorder.isTypeSupported(type)
      );
      recorder = mimeType
        ? new window.MediaRecorder(recorderStream, { mimeType })
        : new window.MediaRecorder(recorderStream);
      recorderChunks = [];
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data && event.data.size) recorderChunks.push(event.data);
      });
      recorder.addEventListener("stop", () => {
        const type = recorder.mimeType || "audio/webm";
        const blob = new Blob(recorderChunks, { type });
        recorderChunks = [];
        if (blob.size) addRecording(blob);
        if (recStatus) {
          recStatus.textContent = "Saved. Play it back or send it to the wall.";
          recStatus.classList.remove("recording");
        }
      });
      recorder.start();
      if (recBtn) recBtn.disabled = true;
      if (recStop) recStop.disabled = false;
      if (recStatus) {
        recStatus.textContent = "Recording… tap stop when you're done.";
        recStatus.classList.add("recording");
      }
    } catch (error) {
      toast("Mic access was blocked. Allow it and try again.", true);
      if (recStatus) recStatus.textContent = "Mic off. Permission needed.";
    }
  }

  function stopRecording() {
    if (recorder && recorder.state !== "inactive") recorder.stop();
    if (recorderStream) recorderStream.getTracks().forEach((track) => track.stop());
    recorderStream = null;
    if (recBtn) recBtn.disabled = false;
    if (recStop) recStop.disabled = true;
    if (recStatus) recStatus.classList.remove("recording");
  }

  function addRecording(blob) {
    if (!recList) return;
    const url = URL.createObjectURL(blob);
    const item = document.createElement("div");
    item.className = "rec-item";

    const audio = document.createElement("audio");
    audio.controls = true;
    audio.preload = "metadata";
    audio.src = url;

    const download = document.createElement("a");
    download.className = "mini-link";
    download.href = url;
    const extension = (blob.type.includes("mp4") && "m4a") || (blob.type.includes("ogg") && "ogg") || "webm";
    download.download = `voice-note-${Date.now()}.${extension}`;
    download.textContent = "Download";

    const save = document.createElement("button");
    save.type = "button";
    save.className = "mini-link";
    save.textContent = "Save to wall";
    save.addEventListener("click", async () => {
      save.disabled = true;
      await uploadBlob(blob, "audio", "Voice note", { source: "recorder" });
      save.disabled = false;
    });

    item.append(audio, download, save);
    recList.prepend(item);
    while (recList.children.length > 8) recList.lastElementChild.remove();
  }

  recBtn?.addEventListener("click", startRecording);
  recStop?.addEventListener("click", stopRecording);

  window.addEventListener("beforeunload", () => {
    if (recorderStream) recorderStream.getTracks().forEach((track) => track.stop());
  });

  /* ======================================================================
     7. MEDIA WALL — server uploads when available, IndexedDB otherwise
     ====================================================================== */

  const DB_NAME = "cq-media-v1";
  const DB_STORE = "items";
  const mediaGrid = $("#mediaGrid");
  const mediaEmpty = $("#mediaEmpty");
  const mediaStatus = $("#mediaStatus");
  const mediaFile = $("#mediaFile");
  const shareLocationBtn = $("#shareLocation");
  const refreshMediaBtn = $("#refreshMedia");

  let mediaItems = [];
  let serverMedia = [];
  let cloudItems = [];
  let localItems = [];
  let serverMode = null;
  let cloudMediaStop = null;

  function openDb() {
    return new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) {
        reject(new Error("IndexedDB is not available."));
        return;
      }
      const request = window.indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(DB_STORE)) {
          request.result.createObjectStore(DB_STORE, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function idbAll() {
    try {
      const db = await openDb();
      return await new Promise((resolve, reject) => {
        const transaction = db.transaction(DB_STORE, "readonly");
        const request = transaction.objectStore(DB_STORE).getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      return [];
    }
  }

  async function idbPut(item) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(DB_STORE, "readwrite");
      transaction.objectStore(DB_STORE).put(item);
      transaction.oncomplete = () => resolve(item);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async function idbDelete(id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(DB_STORE, "readwrite");
      transaction.objectStore(DB_STORE).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async function detectServer() {
    if (serverMode !== null) return serverMode;
    try {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 2500);
      const response = await fetch("/api/health", {
        cache: "no-store",
        signal: controller.signal
      });
      window.clearTimeout(timer);
      if (!response.ok) throw new Error("No server");
      const data = await response.json();
      serverMode = data.ok === true;
    } catch (error) {
      serverMode = false;
    }
    return serverMode;
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  function shrinkImageBlob(file, maxSize = 1600, quality = 0.85) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        try {
          const scale = Math.min(
            1,
            maxSize / Math.max(image.naturalWidth, image.naturalHeight)
          );
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
          const context = canvas.getContext("2d");
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(url);
          canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error("Could not process image."))),
            "image/jpeg",
            quality
          );
        } catch (error) {
          URL.revokeObjectURL(url);
          reject(error);
        }
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("That image could not be read."));
      };
      image.src = url;
    });
  }

  function makeId() {
    return `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function formatDate(value) {
    try {
      return new Date(value).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    } catch (error) {
      return "";
    }
  }

  function kindLabel(kind) {
    if (kind === "image") return "Photo";
    if (kind === "video") return "Video";
    if (kind === "audio") return "Audio";
    if (kind === "location") return "Place";
    return "Memory";
  }

  function renderMedia() {
    if (!mediaGrid) return;
    mediaGrid.innerHTML = "";

    const items = [...mediaItems].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    if (mediaEmpty) mediaEmpty.hidden = items.length > 0;

    items.forEach((item) => {
      const card = document.createElement("article");
      card.className = "media-card";

      if (item.kind === "location") {
        const box = document.createElement("div");
        box.className = "media-loc";
        const pin = document.createElement("span");
        pin.className = "pin";
        pin.textContent = "📍";
        const label = document.createElement("strong");
        label.textContent = item.name || "Shared location";
        const coords = document.createElement("small");
        coords.textContent = `${Number(item.lat).toFixed(4)}, ${Number(item.lng).toFixed(4)}`;
        const link = document.createElement("a");
        link.href = `https://www.openstreetmap.org/?mlat=${item.lat}&mlon=${item.lng}#map=15/${item.lat}/${item.lng}`;
        link.target = "_blank";
        link.rel = "noopener";
        link.textContent = "Open in maps ↗";
        box.append(pin, label, coords, link);
        card.appendChild(box);
      } else {
        let src = item.src;
        if (item.blob) {
          if (!item._url) item._url = URL.createObjectURL(item.blob);
          src = item._url;
        }
        if (src) {
          if (item.kind === "image") {
            const image = document.createElement("img");
            image.className = "media-thumb";
            image.loading = "lazy";
            image.alt = item.name || "A memory";
            image.src = src;
            card.appendChild(image);
          } else if (item.kind === "video") {
            const video = document.createElement("video");
            video.className = "media-thumb";
            video.controls = true;
            video.playsInline = true;
            video.preload = "metadata";
            video.src = src;
            card.appendChild(video);
          } else if (item.kind === "audio") {
            const audio = document.createElement("audio");
            audio.controls = true;
            audio.preload = "metadata";
            audio.src = src;
            card.appendChild(audio);
          }
        }
      }

      const body = document.createElement("div");
      body.className = "media-body";
      const text = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = item.name || kindLabel(item.kind);
      const meta = document.createElement("small");
      meta.textContent = `${kindLabel(item.kind)}${item.createdAt ? ` · ${formatDate(item.createdAt)}` : ""}`;
      text.append(title, meta);
      body.appendChild(text);

      if (item.local) {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "media-remove";
        remove.textContent = "Remove";
        remove.addEventListener("click", async () => {
          try {
            await idbDelete(item.id);
            mediaItems = mediaItems.filter((entry) => entry.id !== item.id);
            renderMedia();
            toast("Removed from this device.");
          } catch (error) {
            toast("Could not remove that item.", true);
          }
        });
        body.appendChild(remove);
      } else if (item.cloud && window.CQCloud && window.CQCloud.currentUser()) {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "media-remove";
        remove.textContent = "Remove";
        remove.addEventListener("click", async () => {
          try {
            await window.CQCloud.deleteMedia(item.id, item.src);
            cloudItems = cloudItems.filter((entry) => entry.id !== item.id);
            rebuildMedia();
            toast("Removed for both of us.");
          } catch (error) {
            toast("Could not remove that item.", true);
          }
        });
        body.appendChild(remove);
      }

      card.appendChild(body);
      mediaGrid.appendChild(card);
    });
  }

  function rebuildMedia() {
    mediaItems = [
      ...serverMedia.map((item) => ({ ...item, local: false })),
      ...cloudItems.map((item) => ({ ...item, local: false })),
      ...localItems.map((item) => ({ ...item, local: true }))
    ];
    renderMedia();
  }

  async function loadMedia(showToast) {
    if (mediaStatus) mediaStatus.textContent = "Loading the wall…";
    serverMedia = [];

    if (await detectServer()) {
      try {
        const response = await fetch("/api/media", { cache: "no-store" });
        if (response.ok) {
          const data = await response.json();
          serverMedia = Array.isArray(data.items) ? data.items : [];
        }
      } catch (error) {
        /* fall back to local */
      }
    }

    localItems = await idbAll();

    const cloud = window.CQCloud;
    if (cloud && cloud.configured) {
      try {
        cloudItems = await cloud.fetchMedia();
      } catch (error) {
        cloudItems = [];
      }
    }

    rebuildMedia();

    if (mediaStatus) {
      if (cloud && cloud.configured) {
        mediaStatus.textContent = cloud.currentUser()
          ? "Uploads save to Supabase so both of us can see them."
          : "Sign in to the chat above to share photos, videos, audio, and places.";
      } else {
        mediaStatus.textContent = serverMode
          ? "Uploads save to the site so both of us can see them."
          : "Uploads save to this device. Run the local server to share them with me.";
      }
    }
    if (showToast) toast("Wall refreshed.");
  }

  async function uploadBlob(blob, kind, name, meta) {
    if (!blob) return null;
    if (mediaStatus) mediaStatus.textContent = "Saving…";

    const cloud = window.CQCloud;
    if (cloud && cloud.configured) {
      if (!cloud.currentUser()) {
        if (mediaStatus) mediaStatus.textContent = "Sign in to the chat above to share.";
        toast("Sign in to the chat above, then share with me 💗", true);
        return null;
      }

      try {
        const file = new File([blob], name || kindLabel(kind), {
          type: blob.type || "application/octet-stream"
        });
        const src = await cloud.uploadFile(file, "media");
        await cloud.sendMedia({
          kind,
          name: name || kindLabel(kind),
          src,
          caption: (meta && meta.caption) || ""
        });
        if (mediaStatus) mediaStatus.textContent = "Saved for both of us.";
        toast("Added to the us wall.");
        return { kind, src };
      } catch (error) {
        if (mediaStatus) mediaStatus.textContent = "Upload failed.";
        toast(cloud.friendlyError(error), true);
        return null;
      }
    }

    if (await detectServer()) {
      try {
        if (blob.size > 45 * 1024 * 1024) {
          throw new Error("That file is larger than 45 MB.");
        }
        const dataUrl = await blobToDataUrl(blob);
        const response = await fetch("/api/media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dataUrl,
            name,
            kind,
            caption: (meta && meta.caption) || ""
          })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Upload failed.");
        const item = { ...(data.item || {}), local: false };
        mediaItems.push(item);
        renderMedia();
        if (mediaStatus) mediaStatus.textContent = "Saved for both of us.";
        toast("Added to the us wall.");
        return item;
      } catch (error) {
        if (mediaStatus) mediaStatus.textContent = "Could not reach the server. Saving on this device.";
        toast(error.message || "Server upload failed. Saving locally.", true);
      }
    }

    const item = {
      id: makeId(),
      kind,
      name,
      blob,
      createdAt: Date.now(),
      local: true,
      ...(meta || {})
    };
    try {
      await idbPut(item);
      mediaItems.push(item);
      renderMedia();
      if (mediaStatus) mediaStatus.textContent = "Saved on this device.";
      toast("Saved on this device.");
      return item;
    } catch (error) {
      toast("Could not save that file on this device.", true);
      return null;
    }
  }

  async function uploadFile(file) {
    if (!file) return;
    let kind = "image";
    if (file.type.startsWith("video/")) kind = "video";
    else if (file.type.startsWith("audio/")) kind = "audio";
    else if (!file.type.startsWith("image/")) {
      toast("Only photos, videos, and audio can go on the wall.", true);
      return;
    }

    if ((kind === "video" || kind === "audio") && file.size > 45 * 1024 * 1024) {
      toast("That file is larger than 45 MB. Try a shorter one.", true);
      return;
    }

    try {
      const blob = kind === "image" ? await shrinkImageBlob(file) : file;
      await uploadBlob(blob, kind, file.name || kindLabel(kind), { caption: "" });
    } catch (error) {
      toast(error.message || "Could not add that file.", true);
    }
  }

  mediaFile?.addEventListener("change", async () => {
    const files = [...(mediaFile.files || [])];
    mediaFile.value = "";
    for (const file of files) {
      await uploadFile(file);
    }
  });

  shareLocationBtn?.addEventListener("click", () => {
    if (!navigator.geolocation) {
      toast("Location sharing is not supported in this browser.", true);
      return;
    }
    if (mediaStatus) mediaStatus.textContent = "Finding you…";
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        let label = "Shared location";
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
          );
          if (response.ok) {
            const data = await response.json();
            if (data && data.display_name) {
              label = data.display_name.split(",").slice(0, 3).join(", ");
            }
          }
        } catch (error) {
          /* keep the generic label */
        }

        const cloud = window.CQCloud;
        if (cloud && cloud.configured && cloud.currentUser()) {
          try {
            await cloud.sendMedia({ kind: "location", name: label, lat, lng });
            if (mediaStatus) mediaStatus.textContent = "Location shared with both of us.";
            toast("Location pinned to the wall.");
            return;
          } catch (error) {
            toast(cloud.friendlyError(error), true);
          }
        }

        if (await detectServer()) {
          try {
            const response = await fetch("/api/location", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ lat, lng, label })
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || "Could not save location.");
            mediaItems.push({ ...(data.item || {}), local: false });
            renderMedia();
            if (mediaStatus) mediaStatus.textContent = "Location shared with both of us.";
            toast("Location pinned to the wall.");
            return;
          } catch (error) {
            toast(error.message || "Saving location on this device instead.", true);
          }
        }

        const item = {
          id: makeId(),
          kind: "location",
          name: label,
          lat,
          lng,
          createdAt: Date.now(),
          local: true
        };
        try {
          await idbPut(item);
          mediaItems.push(item);
          renderMedia();
          if (mediaStatus) mediaStatus.textContent = "Location saved on this device.";
          toast("Location pinned to the wall.");
        } catch (error) {
          toast("Could not save that location.", true);
        }
      },
      (error) => {
        if (mediaStatus) mediaStatus.textContent = "Location permission was not granted.";
        toast(
          error && error.code === 1
            ? "Allow location access to share where you are."
            : "Could not get your location.",
          true
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  });

  refreshMediaBtn?.addEventListener("click", () => {
    serverMode = null;
    loadMedia(true);
  });

  // Load the wall after the page has painted.
  function startCloudMedia() {
    if (cloudMediaStop) {
      try {
        cloudMediaStop();
      } catch (error) {
        /* already gone */
      }
      cloudMediaStop = null;
    }

    const cloud = window.CQCloud;
    if (!cloud || !cloud.configured) return;

    cloud
      .watchMedia(
        (items) => {
          cloudItems = items;
          rebuildMedia();
        },
        () => {}
      )
      .then((stop) => {
        cloudMediaStop = stop;
      })
      .catch(() => {});
  }

  if (mediaGrid) {
    window.setTimeout(() => loadMedia(false), 700);

    if (window.CQCloud && window.CQCloud.configured) {
      window.CQCloud.onAuth(() => {
        startCloudMedia();
        loadMedia(false);
      });
      startCloudMedia();
    }
  }

  /* ======================================================================
     8. “NUDGE ME TO PLAY” BUTTONS — send a private notification
     ====================================================================== */

  $$("[data-live-invite]").forEach((button) => {
    button.addEventListener("click", async () => {
      const sent = await sendNudge("call");
      if (sent) {
        $("#live")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
})();
