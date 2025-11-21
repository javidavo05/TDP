-- Passenger user association migration
-- Migration: 031_passenger_user_association.sql

-- Add user_id column to passengers table for linking to user accounts
ALTER TABLE passengers
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_passengers_user_id ON passengers(user_id);

-- Add comment
COMMENT ON COLUMN passengers.user_id IS 'Optional link to user account for public users to associate their passenger profile';

