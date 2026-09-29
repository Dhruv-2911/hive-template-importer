-- A separate database for the test suite, so tests never touch local development data.
CREATE DATABASE hive_test OWNER hive;
-- Playwright end-to-end runs against the real container use their own database too.
CREATE DATABASE hive_e2e OWNER hive;
