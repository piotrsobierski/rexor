-- Homepage models are explicitly curated; new and existing models default to off.
ALTER TABLE bike_models
    ADD COLUMN is_recommended BOOLEAN NOT NULL DEFAULT FALSE AFTER status;
