# Supabase setup

> **Status: done.** The live site is already connected to the Supabase project
> `lsgnmzzouyevrfjybreg` (`https://lsgnmzzouyevrfjybreg.supabase.co`, region
> `eu-west-1`). The tables, security rules, realtime, the `music`/`photos`
> buckets, and both accounts all exist, and public sign-ups are turned off.
> Keep this page for reference — you only need it if you ever move the site to
> a new Supabase project or need to re-run the setup.

Supabase is the free backend that lets the **live** site save changes, host uploads, and run the private two-person chat. Setting it up from scratch takes about 10 minutes.

You need:

- A Supabase account: <https://supabase.com>
- The two private emails: `liljam175@gmail.com` and `quintanacatie@gmail.com`

---

## 1. Create the project

1. Sign in at <https://supabase.com/dashboard>.
2. Click **New project**.
3. Name it **`catie-quintana`**.
4. Choose a database password and save it somewhere safe (you will not need it for the site, but keep it).
5. Pick the region closest to you.
6. Click **Create new project** and wait about a minute.

## 2. Copy the URL and anon key

1. In the project, open **Project Settings → API** (or **Settings → API Keys**).
2. Copy the **Project URL** — it looks like `https://abcdefghijkl.supabase.co`.
3. Copy the **anon / public** key.
4. Open `supabase-config.js` and replace the two placeholders:

```js
window.CQ_SUPABASE_CONFIG = {
  url: "https://abcdefghijkl.supabase.co",
  anonKey: "eyJhbGciOi..."
};
```

> The anon key is safe to publish. The **service_role** key is not — never put it in this file.

## 3. Create the tables and rules

1. In the dashboard, open **SQL Editor**.
2. Click **New query**.
3. Open `supabase-setup.sql` from this folder, copy all of it, paste it into the editor.
4. Click **Run**.

That creates:

- `site_content` — the saved site copy
- `messages` — the private chat
- `notifications` — the “nudge me to play” banners
- `media` — the shared wall (photos, videos, audio, places)
- realtime on chat, nudges, and the wall
- the public `music`, `photos`, and `media` storage buckets
- security rules that allow only the two emails to write

If you change an email later, update it in **both** `supabase-setup.sql` and `supabase-config.js`, then run the SQL again.

## 4. Create the two accounts

1. Open **Authentication → Users**.
2. Click **Add user → Create new user**.
3. Email: `liljam175@gmail.com`, choose a password, and tick **Auto Confirm User**.
4. Repeat for `quintanacatie@gmail.com`.
5. Send the matching password to each person privately.

The same email + password signs in to both the **Chat** section and the **Admin** page.

### Optional: stop strangers from signing up

1. Open **Authentication → Providers → Email**.
2. Turn **Enable sign ups** off.
3. Save.

You can still add users manually from **Authentication → Users**.

## 5. Turn the site on

Commit and push the site. Then:

1. Open <https://liljam175-gif.github.io/quintana/admin.html>.
2. Sign in with one of the two emails.
3. Edit something and press **Save changes**.
4. Refresh the public site — the change is there.

The chat works the same way: open the **Chat** section on the public site, sign in, and messages appear live in the other person’s browser.

---

## Troubleshooting

| What you see | Fix |
| --- | --- |
| “Supabase is not configured yet” | The URL or anon key in `supabase-config.js` is still a placeholder, or the URL does not end in `.supabase.co`. |
| “Email or password is wrong” | Check the password. If you created the user without **Auto Confirm User**, confirm the email first. |
| “Supabase rules blocked that” | The signed-in email is not one of the two in `supabase-setup.sql`, or you did not run the SQL. |
| “The database tables are missing” | Run `supabase-setup.sql` in the SQL Editor. |
| “The storage bucket is missing” | Re-run `supabase-setup.sql`; the bucket section is near the bottom. |
| Chat connects but messages never appear | Re-run the **Realtime** section of `supabase-setup.sql`, then reload. |
| Uploads fail on a big video | Supabase free tier caps file size. Photos up to 50 MB, songs up to 30 MB. |

## Free tier notes

The free plan includes plenty for two people: 500 MB database, 1 GB file storage, and realtime. The project pauses after a week of no activity; open the dashboard once to wake it, or upgrade if you want it always on.
