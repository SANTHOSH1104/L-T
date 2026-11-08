import * as yup from 'yup';

const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](?:\s*[APap][Mm])?$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const manualPunchSchema = yup.object({
  empId: yup
    .string()
    .trim()
    .min(2, 'Employee ID must be at least 2 characters')
    .max(30, 'Employee ID is too long')
    .required('Employee ID is required'),
  empName: yup
    .string()
    .trim()
    .min(2, 'Employee Name must be at least 2 characters')
    .max(100, 'Employee Name is too long')
    .required('Employee Name is required'),
  department: yup
    .string()
    .trim()
    .max(50, 'Department name is too long')
    .default('General'),
  date: yup
    .string()
    .trim()
    .matches(dateRegex, 'Date must be in YYYY-MM-DD format')
    .required('Date is required'),
  inTime: yup
    .string()
    .trim()
    .matches(timeRegex, 'In Time must be valid format (e.g. 09:00 or 09:00 AM)')
    .required('In Time is required'),
  outTime: yup
    .string()
    .trim()
    .matches(timeRegex, 'Out Time must be valid format (e.g. 18:00 or 06:00 PM)')
    .required('Out Time is required'),
  notes: yup
    .string()
    .trim()
    .max(255, 'Notes must be within 255 characters')
    .optional(),
});

export const shiftPolicySchema = yup.object({
  companyName: yup
    .string()
    .trim()
    .min(2, 'Company name is too short')
    .max(100, 'Company name is too long')
    .required('Company name is required'),
  shiftStart: yup
    .string()
    .trim()
    .matches(timeRegex, 'Shift start must be valid time (e.g. 09:00)')
    .required('Shift start time is required'),
  shiftEnd: yup
    .string()
    .trim()
    .matches(timeRegex, 'Shift end must be valid time (e.g. 18:00)')
    .required('Shift end time is required'),
  fullDayHours: yup
    .number()
    .typeError('Full day hours must be a number')
    .min(1, 'Minimum 1 hour')
    .max(24, 'Maximum 24 hours')
    .required('Full day hours threshold is required'),
  halfDayHours: yup
    .number()
    .typeError('Half day hours must be a number')
    .min(1, 'Minimum 1 hour')
    .max(24, 'Maximum 24 hours')
    .required('Half day hours threshold is required'),
  otThresholdHours: yup
    .number()
    .typeError('OT threshold must be a number')
    .min(1, 'Minimum 1 hour')
    .max(24, 'Maximum 24 hours')
    .required('OT threshold hours is required'),
  graceMinutes: yup
    .number()
    .typeError('Grace minutes must be a number')
    .min(0, 'Cannot be negative')
    .max(120, 'Maximum 120 minutes')
    .default(15),
  otHourlyRate: yup
    .number()
    .optional()
    .default(0),
  minOtQualifyHours: yup
    .number()
    .optional(),
  shifts: yup
    .array()
    .of(
      yup.object({
        shiftCode: yup.string().required(),
        shiftName: yup.string().required(),
        shiftStart: yup.string().required(),
        shiftEnd: yup.string().required(),
        fullDayHours: yup.number().optional(),
        halfDayHours: yup.number().optional(),
        graceMinutes: yup.number().optional(),
        isOvernight: yup.boolean().optional(),
      })
    )
    .optional(),
});

export const updatePunchSchema = yup.object({
  inTime: yup
    .string()
    .trim()
    .matches(timeRegex, 'In Time must be valid format')
    .required('In Time is required'),
  outTime: yup
    .string()
    .trim()
    .matches(timeRegex, 'Out Time must be valid format')
    .required('Out Time is required'),
});

