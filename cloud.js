/* ==========================================================================
   cloud.js — the Supabase bridge for Catie's site.

   Everything degrades safely: if Supabase is not configured yet, the public
   site keeps using content.js, and the chat/admin show a setup message.

   Tables / buckets used:
     site_content             one row (id = 1): { content, updated_at, updated_by }
     messages/{uuid}          { text, sender, sender_name, created_at }
     notifications/{uuid}     { type, text, room, sender, sender_name, created_at }
     Storage buckets: music/, photos/   (public read, allowed-email write)
   ========================================================================== */
(() => {
  "use strict";

  const SDK_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js";

  const config =
    window.CQ_SUPABASE_CONFIG && typeof window.CQ_SUPABASE_CONFIG === "object"
      ? window.CQ_SUPABASE_CONFIG
      : {};

  const url = String(config.url || "").trim();
  const anonKey = String(config.anonKey || "").trim();

  const allowedEmails = (
    Array.isArray(window.CQ_ALLOWED_EMAILS) ? window.CQ_ALLOWED_EMAILS : []
  )
    .map((email) => String(email || "").trim().toLowerCase())
    .filter(Boolean);

  const placeholders = /your_|your-project|replace_me|example\.com/i;
  const configured = Boolean(
    /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url) &&
      anonKey &&
      !placeholders.test([url, anonKey].join(" "))
  );

  let client = null;
  let initError = null;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = [...document.scripts].find((script) => script.src === src);
      if (existing) {
        if (existing.dataset.loaded === "1") resolve();
        else {
          existing.addEventListener("load", () => resolve(), { once: true });
          existing.addEventListener("error", () => reject(new Error(`Could not load ${src}`)), {
            once: true
          });
        }
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.addEventListener(
        "load",
        () => {
          script.dataset.loaded = "1";
          resolve();
        },
        { once: true }
      );
      script.addEventListener(
        "error",
        () => reject(new Error(`Could not load ${src}`)),
        { once: true }
      );
      document.head.appendChild(script);
    });
  }

  function normalizeUser(user) {
    if (!user) return null;
    const email = String(user.email || "").toLowerCase();
    const meta = user.user_metadata || {};
    return {
      uid: user.id,
      id: user.id,
      email,
      displayName:
        meta.display_name || meta.name || (email ? email.split("@")[0] : "Someone")
    };
  }

  const ready = (async () => {
    if (!configured) return null;

    try {
      await loadScript(SDK_URL);

      const factory = window.supabase && window.supabase.createClient;
      if (typeof factory !== "function") {
        throw new Error("The Supabase library did not load.");
      }

      client = factory(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false
        }
      });

      return client;
    } catch (error) {
      initError = error;
      console.error("[CQ cloud] Supabase failed to start:", error);
      return null;
    }
  })();

  function isAllowed(email) {
    return allowedEmails.includes(String(email || "").trim().toLowerCase());
  }

  /* Keep the signed-in user in memory so currentUser() can stay synchronous. */
  let activeUser = null;

  function setActiveUser(user) {
    activeUser = normalizeUser(user);
    return activeUser;
  }

  function requireAllowed() {
    if (!activeUser || !isAllowed(activeUser.email)) {
      throw new Error("Sign in with one of the two private emails first.");
    }
    return activeUser;
  }

  function friendlyError(error) {
    const raw = String(
      (error && (error.message || error.error_description || error.msg)) || ""
    );
    const code = String((error && (error.code || error.error || error.status)) || "");
    const haystack = `${code} ${raw}`.toLowerCase();

    if (/invalid login credentials|invalid_grant|invalid password/.test(haystack)) {
      return "Email or password is wrong.";
    }
    if (/email not confirmed/.test(haystack)) {
      return "Check that email for a confirmation link, then sign in.";
    }
    if (/user already registered/.test(haystack)) {
      return "That account already exists. Try signing in.";
    }
    if (/password should be at least|weak password/.test(haystack)) {
      return "Use a password with at least 6 characters.";
    }
    if (/rate limit|too many requests|email rate/.test(haystack)) {
      return "Too many tries. Wait a minute, then try again.";
    }
    if (/failed to fetch|networkerror|network request failed|load failed/.test(haystack)) {
      return "No internet connection to Supabase.";
    }
    if (/row-level security|permission denied|not authorized|42501/.test(haystack)) {
      return "Supabase rules blocked that. Check that your email is on the allowed list.";
    }
    if (/bucket not found/.test(haystack)) {
      return "The storage bucket is missing. Run supabase-setup.sql again.";
    }
    if (/payload too large|exceeded the maximum allowed size|entity too large/.test(haystack)) {
      return "That file is too large for the bucket.";
    }
    if (/jwt|apikey|api key/.test(haystack) && /invalid/.test(haystack)) {
      return "The Supabase anon key is invalid. Re-copy it from Project Settings → API.";
    }
    if (/relation .* does not exist|schema cache/.test(haystack)) {
      return "The database tables are missing. Run supabase-setup.sql first.";
    }
    if (raw) return raw;
    return "Something went wrong. Try again.";
  }

  async function signIn(email, password) {
    await ready;
    if (!client) {
      throw new Error("Supabase is not configured yet. Add your URL and anon key to supabase-config.js.");
    }

    const { data, error } = await client.auth.signInWithPassword({
      email: String(email || "").trim(),
      password: String(password || "")
    });

    if (error) throw error;

    const user = setActiveUser(data.user);
    if (!isAllowed(user.email)) {
      await client.auth.signOut();
      setActiveUser(null);
      throw new Error("That email is not one of the two private accounts.");
    }

    return user;
  }

  async function signOut() {
    await ready;
    if (client) await client.auth.signOut();
    setActiveUser(null);
  }

  function onAuth(callback) {
    if (typeof callback !== "function") return () => {};

    if (!configured) {
      Promise.resolve().then(() => callback(null));
      return () => {};
    }

    let active = true;
    let subscription = null;

    ready
      .then(async () => {
        if (!client) {
          callback(null);
          return;
        }

        const { data } = await client.auth.getSession();
        if (!active) return;
        callback(setActiveUser(data.session ? data.session.user : null));

        const listener = client.auth.onAuthStateChange((event, session) => {
          if (!active) return;
          const user = setActiveUser(session ? session.user : null);
          /* Defer so callbacks can safely call signIn/signOut without deadlock. */
          window.setTimeout(() => {
            if (active) callback(user);
          }, 0);
        });

        subscription = listener.data ? listener.data.subscription : null;
      })
      .catch(() => callback(null));

    return () => {
      active = false;
      try {
        if (subscription) subscription.unsubscribe();
      } catch (error) {
        /* already gone */
      }
    };
  }

  async function loadContent() {
    await ready;
    if (!client) return null;

    const { data, error } = await client
      .from("site_content")
      .select("content")
      .eq("id", 1)
      .maybeSingle();

    if (error) throw error;
    if (!data || !data.content || typeof data.content !== "object") return null;
    return data.content;
  }

  async function saveContent(content) {
    await ready;
    if (!client) {
      throw new Error("Supabase is not configured yet. Add your URL and anon key to supabase-config.js.");
    }

    const user = requireAllowed();

    const { error } = await client.from("site_content").upsert(
      {
        id: 1,
        content,
        updated_at: new Date().toISOString(),
        updated_by: user.email
      },
      { onConflict: "id" }
    );

    if (error) throw error;
    return true;
  }

  function mapMessage(row) {
    return {
      id: row.id,
      text: row.text || "",
      sender: row.sender || "",
      senderName: row.sender_name || "",
      createdAt: row.created_at || null
    };
  }

  function mapNotification(row) {
    return {
      id: row.id,
      type: row.type || "play",
      text: row.text || "",
      room: row.room || "",
      sender: row.sender || "",
      senderName: row.sender_name || "",
      createdAt: row.created_at || null
    };
  }

  async function fetchMessages() {
    const { data, error } = await client
      .from("messages")
      .select("id, text, sender, sender_name, created_at")
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) throw error;
    return (data || []).map(mapMessage);
  }

  async function watchMessages(callback, onError) {
    await ready;
    if (!client || typeof callback !== "function") return () => {};

    let active = true;
    let channel = null;

    const emit = async () => {
      try {
        const messages = await fetchMessages();
        if (active) callback(messages);
      } catch (error) {
        if (typeof onError === "function") onError(error);
      }
    };

    emit();

    channel = client
      .channel("cq-messages")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => emit()
      )
      .subscribe();

    return () => {
      active = false;
      if (channel) client.removeChannel(channel);
    };
  }

  async function sendMessage(text) {
    await ready;
    if (!client) {
      throw new Error("Supabase is not configured yet. Add your URL and anon key to supabase-config.js.");
    }

    const user = requireAllowed();
    const clean = String(text || "").trim().slice(0, 2000);
    if (!clean) return null;

    const { data, error } = await client
      .from("messages")
      .insert({
        text: clean,
        sender: user.email,
        sender_name: user.displayName
      })
      .select("id")
      .single();

    if (error) throw error;
    return data.id;
  }

  async function fetchNotifications() {
    const { data, error } = await client
      .from("notifications")
      .select("id, type, text, room, sender, sender_name, created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;
    return (data || []).map(mapNotification);
  }

  async function watchNotifications(callback, onError) {
    await ready;
    if (!client || typeof callback !== "function") return () => {};

    let active = true;
    let channel = null;

    const emit = async () => {
      try {
        const notifications = await fetchNotifications();
        if (active) callback(notifications);
      } catch (error) {
        if (typeof onError === "function") onError(error);
      }
    };

    emit();

    channel = client
      .channel("cq-notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => emit()
      )
      .subscribe();

    return () => {
      active = false;
      if (channel) client.removeChannel(channel);
    };
  }

  async function sendNotification(payload) {
    await ready;
    if (!client) {
      throw new Error("Supabase is not configured yet. Add your URL and anon key to supabase-config.js.");
    }

    const user = requireAllowed();
    const data = payload && typeof payload === "object" ? payload : {};
    const room = String(data.room || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);

    const { data: row, error } = await client
      .from("notifications")
      .insert({
        type: String(data.type || "play").slice(0, 32),
        text: String(data.text || "").slice(0, 200),
        room,
        sender: user.email,
        sender_name: user.displayName
      })
      .select("id")
      .single();

    if (error) throw error;
    return row.id;
  }

  async function uploadFile(file, folder) {
    await ready;
    if (!client) {
      throw new Error("Supabase Storage is not configured yet.");
    }

    requireAllowed();

    const bucket = String(folder || "").toLowerCase() === "music" ? "music" : "photos";
    const safeName = String(file.name || "upload")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(-80);
    const path = `${Date.now()}-${safeName || "file"}`;

    const { error } = await client.storage.from(bucket).upload(path, file, {
      contentType: file.type || "application/octet-stream",
      cacheControl: "31536000",
      upsert: false
    });

    if (error) throw error;

    const { data } = client.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  window.CQCloud = {
    configured,
    allowedEmails,
    ready,
    initError: () => initError,
    isAllowed,
    currentUser: () => activeUser,
    friendlyError,
    signIn,
    signOut,
    onAuth,
    loadContent,
    saveContent,
    watchMessages,
    sendMessage,
    watchNotifications,
    sendNotification,
    uploadFile
  };
})();
