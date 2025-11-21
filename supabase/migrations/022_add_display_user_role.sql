-- Migration: Add display user role for public departure screens
-- This role is read-only and only has access to view departure boards

-- Add display role to enum if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin', 'bus_owner', 'driver', 'assistant', 'financial', 'display');
  ELSE
    -- Check if 'display' already exists in the enum
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum 
      WHERE enumlabel = 'display' 
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
    ) THEN
      ALTER TYPE user_role ADD VALUE 'display';
    END IF;
  END IF;
END $$;

-- Note: The users table should already have a role column of type user_role
-- If not, you may need to add it separately

