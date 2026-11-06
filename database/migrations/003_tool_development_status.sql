ALTER TABLE tools DROP CONSTRAINT tools_status_check;
ALTER TABLE tools ADD CONSTRAINT tools_status_check
  CHECK (status IN ('available','development','maintenance','unavailable'));
