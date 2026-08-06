-- Bootstrap console admin: the owner's account becomes the sole porca.admins row.
--
-- Idempotent, and safe to re-apply: it clears any stale rows from earlier bootstrap
-- attempts whose auth user was deleted, then re-seeds from auth.users. If the auth
-- user does not exist yet the insert simply selects zero rows — create the account in
-- the Supabase dashboard (or via signup) and re-run this file.
--
-- The comparison is case-insensitive on purpose: the owner writes the address as
-- Porcaporchetta2025@gmail.com, but GoTrue normalises what it stores in auth.users to
-- lower case. An exact-case `=` would silently match zero rows and leave the console
-- locked for everybody.
delete from porca.admins;

insert into porca.admins (user_id, email)
select id, email from auth.users
 where lower(email) = lower('Porcaporchetta2025@gmail.com');
