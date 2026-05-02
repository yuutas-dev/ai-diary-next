-- オンボーディング時に貼り付けた「いつものLINE」生テキスト（お気に入り5件とは別の基盤お手本）
alter table public.user_profiles
  add column if not exists base_style_text text;
