-- Add 'financial' role to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'financial';

COMMENT ON TYPE user_role IS 'User roles: passenger, admin, pos_agent, bus_owner, driver, assistant, financial';

