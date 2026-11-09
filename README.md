# For Catie 💗

A flirty little website made for **Catie Quintana** — part love letter, part game night.

It includes a photo gallery, a compliment machine, a 12-question quiz with real prize coupons, a memory game, a date-idea spinner, a prize pouch, a like-o-meter, a runaway "No" button, a sealed letter, and a few hidden easter eggs. Emojis render in Apple style on every device.

---

## Quick start

Double-click **`start-site.bat`**.

That starts the server and opens <http://localhost:8080>.

Keep the black window open while the site is running.

### Admin dashboard

Open <http://localhost:8080/admin.html> and enter the PIN from **`admin-key.txt`** (created on first run).

You can edit:

- the hero tagline and the "I'm a little obsessed with her" note
- every compliment
- the "reasons I'm obsessed" cards
- photo captions and photo uploads
- all 12 quiz questions, answers, and prizes
- the date-spinner ideas
- the full letter

Click **Save changes** and refresh the site. The server writes `content.js` and `content.json`, and keeps a backup as `content.js.bak`.

### Photos

Upload them in the admin dashboard (**Photos** tab), or drop them into the `photos` folder named:

```
photos/us-1.jpg
photos/us-2.jpg
photos/us-3.jpg
photos/us-4.jpg
photos/us-5.jpg
photos/us-6.jpg
```

Portrait (4:5) photos look best. Any shape is cropped nicely. Empty slots show a styled placeholder.

---

## Get a public link

### Option A — quick temporary link (works right now)

Run **`start-site.bat`**, then double-click **`start-tunnel.bat`**.

The tunnel window prints a link like:

```
https://something-something.trycloudflare.com
```

That link works anywhere while both windows stay open. It changes every time you restart the tunnel, and it stops working when the windows close.

### Option B — permanent free link on GitHub Pages

1. Create a free GitHub account.
2. Create a new **public** repository (for example `quintana`).
3. Upload `index.html`, `content.js`, `admin.html`, and the `photos` folder.
4. Repo **Settings → Pages → Build and deployment → Deploy from a branch**.
5. Choose **main** and **/ (root)**, then **Save**.
6. Your link: `https://<your-username>.github.io/<repo>/`

On GitHub Pages the site is read-only: the admin page switches to **Static mode** and offers a **Download content.js** button. Replace `content.js` in the repo to publish changes. Photo uploads and live saving need the local server.

### Option C — Netlify Drop (also permanent)

1. Go to <https://app.netlify.com/drop>.
2. Drag in the **`catie-site.zip`** file (or the folder contents).
3. Netlify gives you a permanent link like `https://catie-and-me.netlify.app`.
4. Create a free Netlify account if you want to keep and rename it.

### Option D — same Wi-Fi only

Run `start-site.bat` and open `http://<your-PC-IP>:8080` on her phone.

Your current LAN address is usually `http://192.168.100.5:8080`. Both devices must be on the same Wi-Fi.

---

## Files

| File | What it does |
| --- | --- |
| `index.html` | The whole site (markup, styles, games). |
| `content.js` | Editable content: hero, compliments, reasons, photos, quiz, dates, letter. |
| `content.json` | Same content as JSON, used by the admin API. |
| `admin.html` | PIN-protected admin dashboard. |
| `server.js` | Tiny Node server: static files + save API + photo uploads. |
| `admin-key.txt` | Your PIN. Generated automatically. **Don't share or upload this file.** |
| `start-site.bat` | Starts the server. |
| `start-tunnel.bat` | Starts a public Cloudflare quick tunnel. |
| `start-all.bat` | Starts the server and tunnel together. |
| `photos/` | Your pictures (`us-1.jpg` … `us-6.jpg`). |
| `catie-site.zip` | Ready-to-drop bundle for Netlify. |

---

## Editing by hand

You can still edit `content.js` directly. It looks like this:

```js
window.SITE_CONTENT = {
  hero: { tagline: "...", note: "...", noteAside: "..." },
  compliments: ["...", "..."],
  reasons: [{ emoji: "😊", title: "...", text: "..." }],
  photos: [{ caption: "..." }],
  quiz: [{
    question: "...",
    options: ["...", "...", "...", "..."],
    answer: "...",                 // must match one option exactly
    prize: { id: "p1", emoji: "🍳", text: "..." }
  }],
  dateIdeas: [{ emoji: "🍕", text: "..." }],
  letter: {
    salutation: "Dearest Catie,",
    paragraphs: ["...", "..."],
    signature: "Yours, always. 💌",
    postscript: "P.S. ..."
  }
};
```

Save the file and refresh. Keep quiz `answer` identical to one of its `options`.

---

## Notes

- The site loads Google Fonts and Apple emoji artwork from the internet. Offline it falls back to system fonts and native emojis, so it still works.
- The public tunnel exposes the admin page too, but saving requires the PIN. After 8 wrong attempts an IP is locked out for 10 minutes.
- The prize pouch is stored in the browser (`localStorage`), so Catie keeps her winnings between visits.
