-- Lebenskompass: Datenbank-Struktur
-- Einmal im Supabase SQL Editor ausführen (Dashboard → SQL Editor → New query → einfügen → Run).
-- Jede Zeile gehört genau einer Person (user_id). Row Level Security sorgt dafür,
-- dass nur du deine eigenen Daten lesen und ändern kannst.
-- Alle Felder sind Text, damit du sie am Rechner frei bearbeiten kannst.

create table if not exists public.bereiche (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  name text, farbe text, symbol text, reihenfolge text,
  primary key (user_id, id)
);

create table if not exists public.situationen (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  name text, symbol text, reihenfolge text,
  primary key (user_id, id)
);

create table if not exists public.werte (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  name text, beschreibung text, reihenfolge text,
  primary key (user_id, id)
);

create table if not exists public.regeln (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  titel text, kernsatz text, warum text, schritte text, vorlagen text, skills text,
  "bereichId" text, situationen text, werte text, status text, favorit text,
  erstellt text, geaendert text,
  primary key (user_id, id)
);

create table if not exists public.reflexionen (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  "regelId" text, datum text, wirkung text, notiz text,
  primary key (user_id, id)
);

create table if not exists public.skills (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  titel text, kategorie text, ansatz text, einsatz text, dauer text,
  von text, bis text, diskret text, material text, hinweis text, favorit text,
  schritte text, wirkung text, ausloeser text, quelle text, status text,
  primary key (user_id, id)
);

create table if not exists public.skill_log (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  "skillId" text, datum text, vorher text, nachher text, sterne text, notiz text, ausloeser text,
  primary key (user_id, id)
);

create table if not exists public.dankbarkeit (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  datum text, nr text, text text,
  primary key (user_id, id)
);

create table if not exists public.checkins (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  datum text, art text, schlaf text, energie text, stimmung text, tag text, notiz text,
  primary key (user_id, id)
);

-- Zugriffsschutz: nur eigene Zeilen
do $$
declare t text;
begin
  foreach t in array array['bereiche','situationen','werte','regeln','reflexionen','skills','skill_log','dankbarkeit','checkins']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "nur_eigene" on public.%I', t);
    execute format('create policy "nur_eigene" on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;
