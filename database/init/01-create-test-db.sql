SELECT 'CREATE DATABASE machado_labs_test' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'machado_labs_test')\gexec

