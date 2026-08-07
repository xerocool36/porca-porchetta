-- Porca Porchetta: large tables book online like every other table.
--
-- porca.settings.max_party was 8, and porca.book() refuses anything above it
-- with "chiamaci al 06 6549 5256 — li gestiamo direttamente noi". The owner
-- does not want that gate: the fraschetta has sixty covers and no table plan to
-- protect, so a party of fourteen is a capacity question like any other and
-- porca.book() already answers capacity questions correctly.
--
-- 20 is a ceiling, not a target: it keeps a typo ("200") out of the room while
-- covering every real group. It stays editable from the staff console
-- (Impostazioni), and the column guard in the schema is `max_party 1..40`, so
-- this sits well inside it.
--
-- Scoped to schema porca. The other tenants on this project are untouched.
update porca.settings
   set max_party = 20
 where max_party < 20;
