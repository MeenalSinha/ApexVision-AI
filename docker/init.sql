-- ApexVision AI — Database Init
CREATE DATABASE langflow;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(50),
  video_path TEXT,
  car_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS commentary_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id),
  created_at TIMESTAMP DEFAULT NOW(),
  commentary TEXT,
  event_type VARCHAR(100),
  excitement_level FLOAT
);
