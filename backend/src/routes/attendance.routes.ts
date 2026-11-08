import { Router } from 'express';
import multer from 'multer';
import { 
  getAttendanceLogs,
  getShiftPolicy,
  saveShiftPolicy,
  uploadAndProcess, 
  updatePunchRecord,
  createManualPunch,
  clearAllLogs,
  downloadTemplate, 
  exportProcessedExcel 
} from '../controllers/attendance.controller';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validate.middleware';
import { 
  manualPunchSchema, 
  shiftPolicySchema, 
  updatePunchSchema 
} from '../validations/attendance.validation';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

// All routes protected by Admin Auth Token
router.get('/logs', authenticateToken, getAttendanceLogs);
router.get('/policy', authenticateToken, getShiftPolicy);
router.post('/policy', authenticateToken, validate(shiftPolicySchema), saveShiftPolicy);
router.post('/upload', authenticateToken, upload.single('file'), uploadAndProcess);
router.post('/manual-punch', authenticateToken, validate(manualPunchSchema), createManualPunch);
router.put('/records/:id', authenticateToken, validate(updatePunchSchema), updatePunchRecord);
router.delete('/clear', authenticateToken, clearAllLogs);

// Template and export
router.get('/template', downloadTemplate);
router.post('/export', authenticateToken, exportProcessedExcel);

export default router;
