do $$
declare
  r2_base text := 'https://pub-11aaf71a35c74d7da48843fdfc2c1e44.r2.dev';
begin
  if r2_base is null or length(r2_base) = 0 then
    raise exception 'r2_base is required';
  end if;
end $$;

create or replace function public.normalize_media_url_to_r2(input_url text)
returns text
language plpgsql
as $$
declare
  r2_base text := 'https://pub-11aaf71a35c74d7da48843fdfc2c1e44.r2.dev';
  out_url text;
begin
  if input_url is null then
    return null;
  end if;

  out_url := regexp_replace(
    input_url,
    '^https?://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/',
    r2_base,
    'i'
  );

  out_url := regexp_replace(out_url, r2_base || '/media/', r2_base || '/', 'i');
  out_url := regexp_replace(out_url, r2_base || '/multi_media/', r2_base || '/', 'i');

  return out_url;
end;
$$;

create or replace function public.block_supabase_storage_urls()
returns trigger
language plpgsql
as $$
begin
  if jsonb_path_exists(
    to_jsonb(new),
    '$.** ? (@.type() == "string" && (@ like_regex "supabase\\.co/storage|/storage/v1/object/public/|/storage/v1/render/image" flag "i"))'
  ) then
    raise exception 'Supabase Storage URLs are not allowed. Please store Cloudflare R2 URLs only.';
  end if;

  return new;
end;
$$;

do $$
begin
  if to_regclass('public.profiles') is not null then
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='avatar_url') then
      execute 'update public.profiles set avatar_url = public.normalize_media_url_to_r2(avatar_url) where avatar_url is not null';
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='cover_url') then
      execute 'update public.profiles set cover_url = public.normalize_media_url_to_r2(cover_url) where cover_url is not null';
    end if;

    execute 'drop trigger if exists tr_block_supabase_storage_urls_profiles on public.profiles';
    execute 'create trigger tr_block_supabase_storage_urls_profiles before insert or update on public.profiles for each row execute function public.block_supabase_storage_urls()';
  end if;

  if to_regclass('public.posts') is not null then
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='posts' and column_name='media_url') then
      execute 'update public.posts set media_url = public.normalize_media_url_to_r2(media_url) where media_url is not null';
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='posts' and column_name='video_url') then
      execute 'update public.posts set video_url = public.normalize_media_url_to_r2(video_url) where video_url is not null';
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='posts' and column_name='media_urls') then
      execute '
        update public.posts
        set media_urls = (
          select array_agg(public.normalize_media_url_to_r2(u))
          from unnest(public.posts.media_urls) as u
        )
        where media_urls is not null
      ';
    end if;

    execute 'drop trigger if exists tr_block_supabase_storage_urls_posts on public.posts';
    execute 'create trigger tr_block_supabase_storage_urls_posts before insert or update on public.posts for each row execute function public.block_supabase_storage_urls()';
  end if;

  if to_regclass('public.ideas') is not null then
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='ideas' and column_name='media_url') then
      execute 'update public.ideas set media_url = public.normalize_media_url_to_r2(media_url) where media_url is not null';
    end if;

    execute 'drop trigger if exists tr_block_supabase_storage_urls_ideas on public.ideas';
    execute 'create trigger tr_block_supabase_storage_urls_ideas before insert or update on public.ideas for each row execute function public.block_supabase_storage_urls()';
  end if;

  if to_regclass('public.profile_cv') is not null then
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='profile_cv' and column_name='file_url') then
      execute 'update public.profile_cv set file_url = public.normalize_media_url_to_r2(file_url) where file_url is not null';
    end if;

    execute 'drop trigger if exists tr_block_supabase_storage_urls_profile_cv on public.profile_cv';
    execute 'create trigger tr_block_supabase_storage_urls_profile_cv before insert or update on public.profile_cv for each row execute function public.block_supabase_storage_urls()';
  end if;
end $$;
