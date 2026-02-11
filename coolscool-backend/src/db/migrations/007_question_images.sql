-- Migration 007: Add image support to questions
-- Adds optional image_url and option_images columns for image-based questions

ALTER TABLE questions ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS option_images JSONB;

-- image_url: URL to a question-level image (e.g., diagram, chart)
-- option_images: JSON object mapping option IDs to image URLs
--   Example: {"A": "/images/options/heart.svg", "B": "/images/options/lungs.svg"}
