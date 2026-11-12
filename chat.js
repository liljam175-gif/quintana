/* ==========================================================================
   chat.js — private, real-time chat for the two allowed emails.

   Requires cloud.js + supabase-config.js. If Supabase is not configured,
   the section shows a short setup note and the public site keeps working.
   ========================================================================== */
(() => {
  "use strict";

  const cloud = window.CQCloud;
  const card = document.getElementById("chatCard");
  if (!card) return;

  const login = document.getElementById("chatLogin");
  const app = document.getElementById("chatApp");
  const loginForm = document.getElementById("chatLoginForm");
  const emailInput = document.getElementById("chatEmail");
  const passwordInput = document.getElementById("chatPassword");
  const loginMsg = document.getElementById("chatLoginMsg");
  const hint = document.getElementById("chatHint");
  const who = document.getElementById("chatWho");
  const stateLabel = document.getElementById("chatState");
  const log = document.getElementById("chatLog");
  const empty = document.getElementById("chatEmpty");
  const form = document.getElementById("chatForm");
  const input = document.getElementById("chatInput");
  const sendBtn = document.getElementById("chatSend");
  const signOutBtn = document.getElementById("chatSignOut");
  const nudgeBtn = document.getElementById("chatNudge");

  let currentUser = null;
  let unsubscribeMessages = null;
  let unsubscribeNotifications = null;
  let firstMessages = true;
  let firstNotifications = true;
  const seenNotifications = new Set();
  let stateTimer = null;

  /* ---------------- nudge banner ---------------- */

  const banner = document.createElement("div");
  banner.className = "nudge-banner";
  banner.hidden = true;

  const bannerEmoji = document.createElement("span");
  bannerEmoji.className = "nudge-emoji";
  bannerEmoji.textContent = "💌";

  const bannerCopy = document.createElement("div");
  bannerCopy.className = "nudge-copy";
  const bannerTitle = document.createElement("strong");
  const bannerText = document.createElement("span");
  bannerCopy.append(bannerTitle, bannerText);

  const bannerJoin = document.createElement("button");
  bannerJoin.type = "button";
  bannerJoin.className = "btn small";
  bannerJoin.textContent = "Join me";

  const bannerClose = document.createElement("button");
  bannerClose.type = "button";
  bannerClose.className = "nudge-close";
  bannerClose.setAttribute("aria-label", "Dismiss");
  bannerClose.textContent = "✕";

  banner.append(bannerEmoji, bannerCopy, bannerJoin, bannerClose);
  document.body.appendChild(banner);

  let bannerRoom = "";

  function hideBanner() {
    banner.hidden = true;
    bannerRoom = "";
  }

  bannerClose.addEventListener("click", hideBanner);

  bannerJoin.addEventListener("click", () => {
    const room = bannerRoom;
    hideBanner();
    if (room) {
      window.dispatchEvent(new CustomEvent("cq:join-call", { detail: { room } }));
    } else {
      document.getElementById("quiz")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  function showNudge(notification) {
    const sender = notification.senderName || (notification.sender || "").split("@")[0] || "Someone";
    bannerRoom = notification.room || "";

    bannerTitle.textContent = `${sender} is thinking about you`;
    if (notification.room) {
      bannerText.textContent = "wants you on the live call right now. Tap Join me.";
      bannerJoin.textContent = "Join call";
    } else {
      bannerText.textContent =
        notification.text || "wants to play a game with you. Tap Join me.";
      bannerJoin.textContent = "Let's play";
    }

    banner.hidden = false;
    window.clearTimeout(showNudge.timer);
    showNudge.timer = window.setTimeout(hideBanner, 45000);
  }

  /* ---------------- small helpers ---------------- */

  function setState(text) {
    stateLabel.textContent = text || "live";
    window.clearTimeout(stateTimer);
    if (text && text !== "live") {
      stateTimer = window.setTimeout(() => {
        stateLabel.textContent = "live";
      }, 3200);
    }
  }

  function formatTime(value) {
    if (!value) return "";
    const date = typeof value.toDate === "function" ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  function nearBottom() {
    return log.scrollHeight - log.scrollTop - log.clientHeight < 90;
  }

  function renderMessages(messages) {
    const stick = firstMessages || nearBottom();
    log.innerHTML = "";

    messages.forEach((message) => {
      const own = currentUser && message.sender === currentUser.email;

      const row = document.createElement("div");
      row.className = "chat-message " + (own ? "own" : "theirs");

      const meta = document.createElement("div");
      meta.className = "chat-meta";
      const name = document.createElement("strong");
      name.textContent = own
        ? "You"
        : message.senderName || (message.sender || "").split("@")[0] || "Them";
      const time = document.createElement("span");
      time.textContent = formatTime(message.createdAt);
      meta.append(name, time);

      const bubble = document.createElement("p");
      bubble.className = "chat-bubble";
      bubble.textContent = message.text;

      row.append(meta, bubble);
      log.appendChild(row);
    });

    empty.hidden = messages.length > 0;
    if (stick) log.scrollTop = log.scrollHeight;
    firstMessages = false;
  }

  function clearChat() {
    if (unsubscribeMessages) unsubscribeMessages();
    if (unsubscribeNotifications) unsubscribeNotifications();
    unsubscribeMessages = null;
    unsubscribeNotifications = null;
    firstMessages = true;
    firstNotifications = true;
    seenNotifications.clear();
    log.innerHTML = "";
    empty.hidden = false;
  }

  function showLogin(message) {
    currentUser = null;
    clearChat();
    app.hidden = true;
    login.hidden = false;
    signOutBtn.hidden = true;
    if (message) loginMsg.textContent = message;
  }

  async function startChat(user) {
    currentUser = user;
    login.hidden = true;
    app.hidden = false;
    signOutBtn.hidden = false;
    loginMsg.textContent = "";
    who.textContent = user.email;
    setState("live");

    unsubscribeMessages = await cloud.watchMessages(
      (messages) => renderMessages(messages),
      (error) => {
        setState("connection issue");
        console.warn("[CQ chat] messages:", error);
      }
    );

    unsubscribeNotifications = await cloud.watchNotifications(
      (notifications) => {
        const fresh = notifications.filter(
          (item) => !seenNotifications.has(item.id) && item.sender !== user.email
        );
        notifications.forEach((item) => seenNotifications.add(item.id));

        if (firstNotifications) {
          firstNotifications = false;
          return;
        }

        if (fresh.length) showNudge(fresh[0]);
      },
      (error) => {
        console.warn("[CQ chat] notifications:", error);
      }
    );
  }

  /* ---------------- login / auth ---------------- */

  if (!cloud || !cloud.configured) {
    login.hidden = false;
    app.hidden = true;
    loginForm.hidden = true;
    const heading = login.querySelector("h3");
    if (heading) heading.textContent = "Chat is almost ready";
    if (hint) {
      hint.innerHTML =
        "Chat is not connected yet. Add your Supabase URL and anon key in " +
        "<code>supabase-config.js</code>, then follow <code>SUPABASE-SETUP.md</code>.";
    }
    return;
  }

  if (hint) {
    hint.textContent = "Sign in once on this device. The chat stays live while the page is open.";
  }

  const revealPassword = document.getElementById("chatRevealPassword");
  if (revealPassword) {
    revealPassword.addEventListener("click", () => {
      const showing = passwordInput.type === "text";
      passwordInput.type = showing ? "password" : "text";
      revealPassword.textContent = showing ? "Show password" : "Hide password";
      passwordInput.focus();
    });
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginMsg.textContent = "";

    const email = emailInput.value.trim();
    /* Trim stray spaces from password managers / mobile keyboards. */
    const password = passwordInput.value.trim();
    if (!email || !password) {
      loginMsg.textContent = "Enter your email and password.";
      return;
    }

    const button = loginForm.querySelector("button[type=submit]");
    button.disabled = true;
    button.textContent = "Signing in…";

    try {
      await cloud.signIn(email, password);
      passwordInput.value = "";
    } catch (error) {
      loginMsg.textContent =
        `${cloud.friendlyError(error)} ` +
        `(Tried “${email}” with a ${password.length}-character password.)`;
    } finally {
      button.disabled = false;
      button.textContent = "Sign in";
    }
  });

  signOutBtn.addEventListener("click", async () => {
    signOutBtn.disabled = true;
    try {
      await cloud.signOut();
      showLogin("Signed out. The chat is private again.");
    } catch (error) {
      loginMsg.textContent = cloud.friendlyError(error);
    } finally {
      signOutBtn.disabled = false;
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    sendBtn.disabled = true;
    try {
      await cloud.sendMessage(text);
      input.value = "";
      input.focus();
      setState("sent 💌");
    } catch (error) {
      setState("not sent");
      loginMsg.textContent = cloud.friendlyError(error);
    } finally {
      sendBtn.disabled = false;
    }
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  nudgeBtn.addEventListener("click", async () => {
    nudgeBtn.disabled = true;
    try {
      await cloud.sendNotification({
        type: "play",
        text: "wants to play a game with you."
      });
      setState("nudge sent 🔔");
    } catch (error) {
      setState("nudge failed");
      loginMsg.textContent = cloud.friendlyError(error);
    } finally {
      nudgeBtn.disabled = false;
    }
  });

  cloud.onAuth(async (user) => {
    if (!user) {
      showLogin();
      return;
    }

    if (!cloud.isAllowed(user.email)) {
      await cloud.signOut();
      showLogin("That email is not one of the two private accounts.");
      return;
    }

    if (currentUser && currentUser.uid === user.uid && !app.hidden) return;
    await startChat(user);
  });
})();
