-- Materialize theme_clusters from the seeded reddit_posts' lexicon themes.
--
-- WHY: the sentiment UI reads theme_clusters, which are normally produced by
-- the worker's clustering job (semantic, requires EMBEDDINGS_API_KEY). Without
-- a worker + OpenAI key, theme_clusters stays empty and the seeded corpus's
-- themes are invisible. This migration computes the same per-school theme
-- breakdown straight from the posts' `themes` text array using pure SQL, so
-- the app shows "what teachers talk about" out of the box — zero external
-- dependencies. The worker upgrades these to semantic clusters once it runs.
--
-- Requires 0009 (reddit_posts seed) and `bun db:seed` (schools) to have run.
-- Idempotent: deletes its own prior rows (matched on the per-school window)
-- before re-inserting.

-- 1) Remove any rows this migration previously wrote (same per-school window).
DELETE FROM theme_clusters tc
USING (
  SELECT school_id, min(created_at) AS w_start
  FROM reddit_posts
  WHERE school_id IS NOT NULL
  GROUP BY school_id
) w
WHERE tc.school_id = w.school_id
  AND tc.window_start = w.w_start;

-- 2) Aggregate lexicon themes into one theme_clusters row per (school, theme).
--    CASE mirrors canonicalTheme() in src/lib/ai/clustering.ts so the labels
--    (Pay / Management / ...) match what the semantic path emits.
INSERT INTO theme_clusters (
  school_id, theme_label, summary, post_count, sentiment_score,
  window_start, window_end, computed_at
)
SELECT
  agg.school_id,
  agg.theme_label,
  left(coalesce(string_agg(DISTINCT agg.title, ' · ' ORDER BY agg.title), ''), 300),
  count(*)::integer,
  round(avg(coalesce(agg.sentiment_score, 0))::numeric, 2),
  agg.min_created,
  agg.max_created,
  now()
FROM (
  SELECT
    s.school_id,
    CASE u.t
      WHEN 'Salary'    THEN 'Pay'
      WHEN 'Leadership' THEN 'Management'
      ELSE u.t
    END AS theme_label,
    NULLIF(s.title, '') AS title,
    s.sentiment_score,
    w.min_created,
    w.max_created
  FROM reddit_posts s
  CROSS JOIN LATERAL unnest(s.themes) AS u(t)
  JOIN (
    SELECT school_id,
           min(created_at) AS min_created,
           max(created_at) AS max_created
    FROM reddit_posts
    WHERE school_id IS NOT NULL
    GROUP BY school_id
  ) w ON w.school_id = s.school_id
  WHERE s.school_id IS NOT NULL
) agg
GROUP BY agg.school_id, agg.theme_label, agg.min_created, agg.max_created;
