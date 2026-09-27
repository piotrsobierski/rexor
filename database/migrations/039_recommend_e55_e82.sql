-- E55 and E82 are the requested homepage recommendations on QA and production.
-- Homepage recommendations require published status; leave all other models alone.
UPDATE bike_models
SET is_recommended = TRUE, status = 'published'
WHERE slug IN ('e55', 'e82');
