-- Odds snapshots: stores a point-in-time capture of all odds for a race
CREATE TABLE odds_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT NOT NULL,               -- The Odds API event ID
  event_name TEXT NOT NULL,             -- e.g., "Cheltenham 14:30"
  sport_key TEXT NOT NULL,              -- e.g., "horse_racing"
  commence_time TIMESTAMPTZ NOT NULL,   -- Race start time
  snapshot_time TIMESTAMPTZ DEFAULT NOW(), -- When we captured these odds
  bookmaker TEXT NOT NULL,              -- e.g., "betfair_ex_uk", "bet365"
  runner_name TEXT NOT NULL,            -- Horse name
  back_price DECIMAL(10,4),             -- Best back odds
  lay_price DECIMAL(10,4),              -- Best lay odds (if exchange)
  is_opening BOOLEAN DEFAULT FALSE,     -- Flag: is this the first snapshot we captured?
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_snapshots_event ON odds_snapshots(event_id, runner_name);
CREATE INDEX idx_snapshots_time ON odds_snapshots(snapshot_time);
CREATE INDEX idx_snapshots_opening ON odds_snapshots(event_id, runner_name, is_opening);

-- User settings: stores configurable parameters
CREATE TABLE user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO user_settings (setting_key, setting_value) VALUES
  ('bankroll', '{"amount": 1000, "currency": "GBP"}'),
  ('thresholds', '{"conservative": 15, "strong": 25, "premium": 40}'),
  ('kelly_mode', '{"mode": "full", "multiplier": 1.0}'),
  ('field_size_filter', '{"min": 8, "max": 14}'),
  ('max_liability_pct', '{"value": 1.5}');

-- Enable Row Level Security
ALTER TABLE odds_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- For Phase 1 (single user), allow all access via service role
CREATE POLICY "Allow all for service role" ON odds_snapshots FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON user_settings FOR ALL USING (true);
