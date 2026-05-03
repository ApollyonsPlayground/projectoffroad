-- Project Offroad: Social tables migration
-- Run once in Supabase SQL Editor

-- ── posts ──────────────────────────────────────────────────────────────────────
create table if not exists public.posts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade,
  user_name     text,
  avatar_url    text,
  caption       text not null,
  image_url     text,
  rig_name      text,
  rig_specs     text,
  likes_count   integer not null default 0,
  comments_count integer not null default 0,
  verified      boolean not null default false,
  created_at    timestamptz not null default now()
);

alter table public.posts enable row level security;

create policy "Anyone can read posts"
  on public.posts for select using (true);

create policy "Authenticated users can insert own posts"
  on public.posts for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own posts"
  on public.posts for delete
  using (auth.uid() = user_id);

-- ── likes ──────────────────────────────────────────────────────────────────────
create table if not exists public.likes (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid references public.posts(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(post_id, user_id)
);

alter table public.likes enable row level security;

create policy "Anyone can read likes"
  on public.likes for select using (true);

create policy "Authenticated users can like"
  on public.likes for insert
  with check (auth.uid() = user_id);

create policy "Users can unlike own likes"
  on public.likes for delete
  using (auth.uid() = user_id);

-- Keep likes_count in sync
create or replace function public.update_post_likes_count()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    update public.posts set likes_count = likes_count + 1 where id = NEW.post_id;
  elsif TG_OP = 'DELETE' then
    update public.posts set likes_count = greatest(likes_count - 1, 0) where id = OLD.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists on_like_change on public.likes;
create trigger on_like_change
  after insert or delete on public.likes
  for each row execute procedure public.update_post_likes_count();

-- ── bookmarks ──────────────────────────────────────────────────────────────────
create table if not exists public.bookmarks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  post_id    uuid references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, post_id)
);

alter table public.bookmarks enable row level security;

create policy "Users can read own bookmarks"
  on public.bookmarks for select
  using (auth.uid() = user_id);

create policy "Authenticated users can bookmark"
  on public.bookmarks for insert
  with check (auth.uid() = user_id);

create policy "Users can remove own bookmarks"
  on public.bookmarks for delete
  using (auth.uid() = user_id);

-- ── reports ────────────────────────────────────────────────────────────────────
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null,
  post_id     uuid references public.posts(id) on delete cascade,
  reason      text not null,
  details     text,
  status      text not null default 'pending' check (status in ('pending','reviewed','dismissed')),
  created_at  timestamptz not null default now()
);

alter table public.reports enable row level security;

create policy "Authenticated users can report"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

create policy "Admins can read reports"
  on public.reports for select
  using (auth.uid() = reporter_id);

-- ── vehicles ───────────────────────────────────────────────────────────────────
create table if not exists public.vehicles (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade,
  year          integer not null,
  make          text not null,
  model         text not null,
  trim          text,
  modifications text,
  photo_url     text,
  is_primary    boolean not null default false,
  created_at    timestamptz not null default now()
);

alter table public.vehicles enable row level security;

create policy "Anyone can read vehicles"
  on public.vehicles for select using (true);

create policy "Users can manage own vehicles"
  on public.vehicles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── users (profile extension) ──────────────────────────────────────────────────
create table if not exists public.users (
  id               uuid primary key references auth.users(id) on delete cascade,
  name             text,
  avatar_url       text,
  bio              text,
  location         text,
  experience_level text default 'Beginner',
  instagram        text,
  is_verified      boolean not null default false,
  created_at       timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Anyone can read user profiles"
  on public.users for select using (true);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can insert own profile"
  on public.users for insert
  with check (auth.uid() = id);

-- Auto-create user profile row on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, name, avatar_url)
  values (
    NEW.id,
    coalesce(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return NEW;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Storage bucket for post images ─────────────────────────────────────────────
-- Run this in the Supabase dashboard Storage section, or via the JS client:
--   supabase.storage.createBucket('post-images', { public: true })
-- RLS policy: allow authenticated inserts, public reads.
