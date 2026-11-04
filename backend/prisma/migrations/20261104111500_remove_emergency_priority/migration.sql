ALTER TABLE "patients" DROP COLUMN "emergencyPriority";
ALTER TABLE "emergency_requests" DROP COLUMN "priority";
DROP TYPE "EmergencyPriority";
