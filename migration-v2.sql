-- GTA 6 Central v2: migração complementar e não destrutiva.
-- Execute no SQL Editor do projeto Supabase EXISTENTE. Não apaga tabelas nem publicações.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.member_stats (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  points integer not null default 0 check (points >= 0),
  updated_at timestamptz not null default now()
);
create table if not exists public.user_achievements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_slug text not null,
  earned_at timestamptz not null default now(),
  primary key(user_id, achievement_slug)
);

alter table public.articles add column if not exists category text not null default 'Notícias';
alter table public.articles add column if not exists image_url text;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.admin_users where user_id = (select auth.uid())); $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.admin_users enable row level security;
alter table public.member_stats enable row level security;
alter table public.user_achievements enable row level security;

drop policy if exists "admins can read own admin flag" on public.admin_users;
create policy "admins can read own admin flag" on public.admin_users for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "member stats are public" on public.member_stats;
create policy "member stats are public" on public.member_stats for select using (true);
drop policy if exists "achievements are public" on public.user_achievements;
create policy "achievements are public" on public.user_achievements for select using (true);

drop policy if exists "admins can read all articles" on public.articles;
create policy "admins can read all articles" on public.articles for select to authenticated using (public.is_admin());
drop policy if exists "admins insert articles" on public.articles;
create policy "admins insert articles" on public.articles for insert to authenticated with check (public.is_admin());
drop policy if exists "admins update articles" on public.articles;
create policy "admins update articles" on public.articles for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins delete articles" on public.articles;
create policy "admins delete articles" on public.articles for delete to authenticated using (public.is_admin());

-- Pontos e medalhas são atualizados no banco; usuários não podem editar sua própria pontuação.
create or replace function public.award_member_activity()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_user uuid; v_count integer;
begin
  if tg_table_name = 'posts' then v_user := new.author_id;
  else v_user := new.author_id;
  end if;
  insert into public.member_stats(user_id,points) values(v_user, case when tg_table_name='posts' then 10 else 3 end)
  on conflict(user_id) do update set points = public.member_stats.points + excluded.points, updated_at = now();
  if tg_table_name='posts' then
    select count(*) into v_count from public.posts where author_id=v_user;
    if v_count >= 1 then insert into public.user_achievements(user_id,achievement_slug) values(v_user,'first_post') on conflict do nothing; end if;
    if v_count >= 5 then insert into public.user_achievements(user_id,achievement_slug) values(v_user,'five_posts') on conflict do nothing; end if;
  else
    insert into public.user_achievements(user_id,achievement_slug) values(v_user,'first_comment') on conflict do nothing;
  end if;
  return new;
end; $$;

drop trigger if exists award_points_for_post on public.posts;
create trigger award_points_for_post after insert on public.posts for each row execute function public.award_member_activity();
drop trigger if exists award_points_for_comment on public.comments;
create trigger award_points_for_comment after insert on public.comments for each row execute function public.award_member_activity();

-- Para tornar sua conta administradora: primeiro crie a conta no site e confirme o e-mail.
-- Depois substitua o e-mail abaixo pelo seu e execute APENAS esta instrução no SQL Editor:
-- insert into public.admin_users(user_id)
-- select id from auth.users where lower(email)=lower('SEU_EMAIL_AQUI')
-- on conflict(user_id) do nothing;

-- Permissões SQL: as políticas RLS acima continuam sendo a barreira de acesso.
grant select on public.member_stats to anon, authenticated;
grant select on public.user_achievements to anon, authenticated;
grant select on public.admin_users to authenticated;
grant select, insert, update, delete on public.articles to authenticated;
grant select on public.articles to anon;

-- Inclui membros já existentes no placar sem alterar suas publicações.
insert into public.member_stats(user_id, points)
select id, 0 from public.profiles
on conflict (user_id) do nothing;

drop policy if exists "admins can moderate posts" on public.posts;
create policy "admins can moderate posts" on public.posts for delete to authenticated using (public.is_admin());
drop policy if exists "admins can moderate comments" on public.comments;
create policy "admins can moderate comments" on public.comments for delete to authenticated using (public.is_admin());
