-- New values cannot be used until this migration commits.
ALTER TYPE "ShopOrderStatus" ADD VALUE IF NOT EXISTS 'READY_FOR_PICKUP';
ALTER TYPE "ShopOrderStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
