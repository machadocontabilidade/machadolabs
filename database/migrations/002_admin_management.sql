CREATE TABLE categories (
  name text PRIMARY KEY CHECK (length(trim(name)) BETWEEN 1 AND 80),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO categories(name)
SELECT DISTINCT category FROM tools
ON CONFLICT DO NOTHING;

ALTER TABLE tools
  ADD COLUMN responsible_id uuid REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE tools
  ADD CONSTRAINT tools_category_fk
  FOREIGN KEY (category) REFERENCES categories(name)
  ON UPDATE CASCADE ON DELETE RESTRICT;

CREATE INDEX tools_responsible_idx ON tools(responsible_id);
CREATE INDEX security_events_user_created_idx ON security_events(user_id, created_at DESC);
