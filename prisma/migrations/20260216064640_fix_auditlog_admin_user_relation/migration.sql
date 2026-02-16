-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_adminId_fkey";

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
