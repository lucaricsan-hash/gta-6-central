-- GTA 6 Central — esquema inicial para Supabase.
-- Execute em um projeto novo. Se já houver tabelas/dados, faça backup e revise antes.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 30),
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 1000),
  created_at timestamptz not null default now()
);

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now()
);

create table if not exists public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_type text not null check (item_type in ('character', 'vehicle', 'location', 'article')),
  item_slug text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, item_type, item_slug)
);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null default '',
  source_name text not null,
  source_url text not null,
  published_at timestamptz,
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists posts_created_at_idx on public.posts(created_at desc);
create index if not exists comments_post_id_idx on public.comments(post_id);
create index if not exists articles_published_at_idx on public.articles(published_at desc);

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.comments enable row level security;
alter table public.favorites enable row level security;
alter table public.articles enable row level security;

-- Recria políticas com nomes conhecidos para permitir reaplicar este arquivo.
drop policy if exists "profiles readable by everyone" on public.profiles;
drop policy if exists "users insert own profile" on public.profiles;
drop policy if exists "users update own profile" on public.profiles;
drop policy if exists "posts readable by everyone" on public.posts;
drop policy if exists "authenticated users create posts" on public.posts;
drop policy if exists "authors update own posts" on public.posts;
drop policy if exists "authors delete own posts" on public.posts;
drop policy if exists "likes readable by everyone" on public.post_likes;
drop policy if exists "users add own likes" on public.post_likes;
drop policy if exists "users remove own likes" on public.post_likes;
drop policy if exists "comments readable by everyone" on public.comments;
drop policy if exists "authenticated users comment" on public.comments;
drop policy if exists "authors delete own comments" on public.comments;
drop policy if exists "users read own favorites" on public.favorites;
drop policy if exists "users add own favorites" on public.favorites;
drop policy if exists "users delete own favorites" on public.favorites;
drop policy if exists "verified articles readable" on public.articles;

create policy "profiles readable by everyone" on public.profiles
  for select using (true);
create policy "users insert own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = id);
create policy "users update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Cria o perfil no cadastro e garante nome dentro do limite da tabela.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate_name text;
begin
  candidate_name := left(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 30);
  if char_length(candidate_name) < 2 then
    candidate_name := left(split_part(coalesce(new.email, ''), '@', 1), 30);
  end if;
  if char_length(candidate_name) < 2 then
    candidate_name := 'Jogador';
  end if;

  insert into public.profiles (id, display_name)
  values (new.id, candidate_name)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute procedure public.handle_new_user();

create policy "posts readable by everyone" on public.posts
  for select using (true);
create policy "authenticated users create posts" on public.posts
  for insert to authenticated with check (auth.uid() = author_id);
create policy "authors update own posts" on public.posts
  for update to authenticated using (auth.uid() = author_id) with check (auth.uid() = author_id);
create policy "authors delete own posts" on public.posts
  for delete to authenticated using (auth.uid() = author_id);

create policy "likes readable by everyone" on public.post_likes
  for select using (true);
create policy "users add own likes" on public.post_likes
  for insert to authenticated with check (auth.uid() = user_id);
create policy "users remove own likes" on public.post_likes
  for delete to authenticated using (auth.uid() = user_id);

create policy "comments readable by everyone" on public.comments
  for select using (true);
create policy "authenticated users comment" on public.comments
  for insert to authenticated with check (auth.uid() = author_id);
create policy "authors delete own comments" on public.comments
  for delete to authenticated using (auth.uid() = author_id);

create policy "users read own favorites" on public.favorites
  for select to authenticated using (auth.uid() = user_id);
create policy "users add own favorites" on public.favorites
  for insert to authenticated with check (auth.uid() = user_id);
create policy "users delete own favorites" on public.favorites
  for delete to authenticated using (auth.uid() = user_id);

-- Artigos são públicos apenas depois de aprovados; publicação é administrativa.
create policy "verified articles readable" on public.articles
  for select using (is_verified = true);
