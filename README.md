# For Catie 💗

A flirty little website made for **Catie Quintana** — part love letter, part game night.

It includes a photo gallery, a compliment machine, a 12-question quiz with real prize coupons, a memory game, a date-idea spinner, a prize pouch, a like-o-meter, a runaway "No" button, a sealed letter, and a few hidden easter eggs. Emojis render in Apple style on every device.

It also has a music player that autoplays (with an uploaded song if you add one), rotating notes and letters that change after she reads them, a live Jitsi call with an invite link, voice recording, a shared media wall with photo/video/audio uploads and location sharing, and four play-together games: Truth & Dare, Lovers Audition, Dance Challenge, and Couples Trivia. The two photos you supplied are used as subtle page watermarks and the letter seal.

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
- **Extras:** rotating notes, rotating letters, music tracks and uploads, the live-call room, truths, dares, audition prompts, dance moves, and couples trivia

Click **Save changes** and refresh the site. The server writes `content.js` and `content.json`, and keeps a backup as `content.js.bak`.

### Music

The player autoplays a soft generated track, so it works even with no audio files.

To use your own song:

1. Open the admin **Extras** tab.
2. Under **Music**, click **Upload a song**.
3. The song is saved in `music/`, added to the track list, and marked as the opening track.
4. Click **Save changes**.

Supported: MP3, M4A, AAC, WAV, OGG, FLAC. Max 30 MB. Use songs you have the right to share.

On GitHub Pages (static mode) the admin downloads the song instead. Put that file in the `music/` folder, then upload the updated `content.js` to the repo. Uploaded songs are committed with the rest of the site, so they play for everyone.

### Live call and voice notes

The **Live** section opens a private Jitsi Meet room and gives you an invite link. Send it to Catie and you both land in the same call — no account needed. She can also record a voice note in the browser, play it back, download it, or save it to the wall.

### Media wall

The **Wall** section accepts photos, videos, and audio, plus a **Share my location** button.

- With `server.js` running, uploads are saved in `media/` and both of you see them.
- On GitHub Pages, uploads stay on that device in IndexedDB. True cross-device sharing needs the local server.

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
3. Upload `index.html`, `content.js`, `features.js`, `admin.html`, `404.html`, the `assets` folder, the `music` folder, the `admin` folder, and the `photos` folder.
4. Repo **Settings → Pages → Build and deployment → Deploy from a branch**.
5. Choose **main** and **/ (root)**, then **Save**.
6. Your link: `https://<your-username>.github.io/<repo>/`

The admin page is at **`https://<your-username>.github.io/<repo>/admin.html`** — the repo name must be in the URL. `.../admin/` also redirects there, and a wrong path shows a friendly page with the right links.

On GitHub Pages the site is read-only: the admin page switches to **Static mode** and offers a **Download content.js** button. Replace `content.js` in the repo to publish changes. Photo, music, and media uploads need the local server (or a manual file upload to the repo).

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
| `content.js` | Editable content: hero, compliments, reasons, photos, quiz, dates, letters, notes, music, live, and game decks. |
| `content.json` | Same content as JSON, used by the admin API. |
| `features.js` | Music player, rotating notes/letters, new games, live call, voice recorder, and media wall. |
| `admin.html` | PIN-protected admin dashboard, including the Extras tab. |
| `server.js` | Tiny Node server: static files + save API + photo, music, media, and location uploads. |
| `admin-key.txt` | Your PIN. Generated automatically. **Don't share or upload this file.** |
| `start-site.bat` | Starts the server. |
| `start-tunnel.bat` | Starts a public Cloudflare quick tunnel. |
| `start-all.bat` | Starts the server and tunnel together. |
| `assets/` | The two supplied photos, used as the watermark and the letter seal. |
| `music/` | Your uploaded songs. |
| `photos/` | Your pictures (`us-1.jpg` … `us-6.jpg`). |
| `404.html` | Friendly wrong-page screen with the correct links. |
| `admin/` | Redirect so `.../admin/` opens the admin page. |
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

The newer sections (`letters`, `notes`, `music`, `live`, `truths`, `dares`, `audition`, `danceMoves`, `couplesTrivia`) follow the same shape. The admin **Extras** tab is the easiest way to edit them.

---

## Notes

- The site loads Google Fonts and Apple emoji artwork from the internet. Offline it falls back to system fonts and native emojis, so it still works.
- Browsers usually block autoplay until the first tap. The player shows **tap to play** and starts on the first tap anywhere on the page.
- Uploaded songs are saved in `music/` and play for everyone once committed and pushed.
- The public tunnel exposes the admin page too, but saving requires the PIN. After 8 wrong attempts an IP is locked out for 10 minutes.
- The prize pouch is stored in the browser (`localStorage`), so Catie keeps her winnings between visits.
- The media wall is device-local on GitHub Pages. Cross-device uploads and location sharing need `server.js` running.
