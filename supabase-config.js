/* ==========================================================================
   Supabase settings for Catie's site.

   Replace the two placeholder values below with the Project URL and the
   anon/public key from:
     Supabase Dashboard -> Project Settings -> API

   The anon key is not a secret. It is safe to commit and serve. Access is
   controlled by the row-level security policies in supabase-setup.sql and
   by the two emails listed in CQ_ALLOWED_EMAILS.

   Never put the "service_role" key in this file. It bypasses all security.
   ========================================================================== */

window.CQ_SUPABASE_CONFIG = {
  url: "https://YOUR_PROJECT_REF.supabase.co",
  anonKey: "YOUR_ANON_KEY"
};

/* Only these two accounts can open the admin or the private chat.
   Use lowercase. Keep this list identical to the emails in
   supabase-setup.sql. */
window.CQ_ALLOWED_EMAILS = [
  "liljam175@gmail.com",
  "quintanacatie@gmail.com"
];
