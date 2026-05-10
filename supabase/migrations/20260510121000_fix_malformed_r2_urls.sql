do $$
declare
  r2_base text := 'https://pub-11aaf71a35c74d7da48843fdfc2c1e44.r2.dev';
  r2_base_slash text;
begin
  if r2_base is null or length(r2_base) = 0 then
    raise exception 'r2_base is required';
  end if;

  r2_base_slash := regexp_replace(r2_base, '/+$', '') || '/';

  create or replace function public.normalize_media_url_to_r2(input_url text)
  returns text
  language plpgsql
  as $$
  declare
    r2_base text := 'https://pub-11aaf71a35c74d7da48843fdfc2c1e44.r2.dev';
    base_slash text;
    out_url text;
  begin
    if input_url is null then
      return null;
    end if;

    base_slash := regexp_replace(r2_base, '/+$', '') || '/';

    -- Replace Supabase public object base with R2 base (ensure trailing slash)
    out_url := regexp_replace(
      input_url,
      '^https?://[a-z0-9-]+\\.supabase\\.co/storage/v1/object/public/',
      base_slash,
      'i'
    );

    -- Fix previously malformed concatenations: "...r2.devmedia/..." or "...r2.devmulti_media/..."
    out_url := regexp_replace(out_url, '\\.(r2\\.dev)media/', '.\\1/media/', 'i');
    out_url := regexp_replace(out_url, '\\.(r2\\.dev)multi_media/', '.\\1/multi_media/', 'i');

    -- If legacy buckets were embedded in the path after replacement, flatten them.
    out_url := regexp_replace(out_url, base_slash || 'media/', base_slash, 'i');
    out_url := regexp_replace(out_url, base_slash || 'multi_media/', base_slash, 'i');

    return out_url;
  end;
  $$;

  -- Repair already-stored malformed URLs in common tables (if they exist)
  if to_regclass('public.posts') is not null then
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='posts' and column_name='media_url') then
      execute format($f$
        update public.posts
        set media_url = regexp_replace(media_url, '\\.(r2\\.dev)media/', '.\\1/media/', 'i')
        where media_url is not null and media_url ilike '%%.r2.devmedia/%%'
      $f$);
    end if;

    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='posts' and column_name='audio_url') then
      execute format($f$
        update public.posts
        set audio_url = regexp_replace(audio_url, '\\.(r2\\.dev)media/', '.\\1/media/', 'i')
        where audio_url is not null and audio_url ilike '%%.r2.devmedia/%%'
      $f$);
    end if;

    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='posts' and column_name='media_urls') then
      execute '
        update public.posts
        set media_urls = (
          select array_agg(
            regexp_replace(u, ''\\.(r2\\.dev)media/'', ''.\\1/media/'', ''i'')
          )
          from unnest(public.posts.media_urls) as u
        )
        where media_urls is not null
      ';
    end if;
  end if;

  if to_regclass('public.profiles') is not null then
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='avatar_url') then
      execute format($f$
        update public.profiles
        set avatar_url = regexp_replace(avatar_url, '\\.(r2\\.dev)media/', '.\\1/media/', 'i')
        where avatar_url is not null and avatar_url ilike '%%.r2.devmedia/%%'
      $f$);
    end if;

    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='cover_url') then
      execute format($f$
        update public.profiles
        set cover_url = regexp_replace(cover_url, '\\.(r2\\.dev)media/', '.\\1/media/', 'i')
        where cover_url is not null and cover_url ilike '%%.r2.devmedia/%%'
      $f$);
    end if;
  end if;

  if to_regclass('public.profile_cv') is not null then
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='profile_cv' and column_name='file_url') then
      execute format($f$
        update public.profile_cv
        set file_url = regexp_replace(file_url, '\\.(r2\\.dev)media/', '.\\1/media/', 'i')
        where file_url is not null and file_url ilike '%%.r2.devmedia/%%'
      $f$);
    end if;
  end if;
end $$;
