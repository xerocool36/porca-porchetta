/* booking-config.js
 *
 * Configuration for js/booking.js, kept in a real file rather than an inline
 * <script> on prenota.html. The CSP in netlify.toml ships `script-src 'self'`
 * with no 'unsafe-inline' — an inline block would simply be dropped, CFG would
 * come out {} and booking.js would silently render its phone-only fallback,
 * which looks exactly like a deliberately suspended booking system. The page
 * takes a name, an email, a phone number and a consent checkbox, so relaxing
 * the CSP is not the trade to make.
 *
 * Load order on prenota.html: this file, then js/booking.js.
 *
 * anonKey stays the literal placeholder in the repo; it is filled at deploy.
 * (It is a publishable anon key either way, but there is no reason to carry it
 * in a public repo.)
 */
window.PORCA_BOOKING_CONFIG = {
  functionsUrl: "https://wednfenmftdlywrglhgj.supabase.co/functions/v1",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlZG5mZW5tZnRkbHl3cmdsaGdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MTkzODQsImV4cCI6MjA5MTk5NTM4NH0.iKXesGP9UJl2tLuYKupRkcrGGz0GR-NOPu6upR46YdU",
  turnstileSiteKey: "",
  privacyUrl: "privacy.html"
};
