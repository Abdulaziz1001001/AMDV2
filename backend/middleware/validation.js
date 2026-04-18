const { z } = require('zod');

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required').max(200),
  password: z.string().min(1, 'Password is required').max(500),
});

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD');
const isoDateTimeSchema = z.string().datetime({ offset: true });

const attendanceStatusSchema = z.enum(['present', 'late', 'absent', 'early_leave']);
const approvalStatusSchema = z.enum(['none', 'pending', 'approved', 'rejected']);

const attendanceUpsertSchema = z.object({
  employeeId: z.string().trim().min(1, 'employeeId is required'),
  date: isoDateSchema,
  checkIn: isoDateTimeSchema.optional(),
  checkOut: isoDateTimeSchema.optional(),
  checkInLat: z.number().finite().optional(),
  checkInLng: z.number().finite().optional(),
  checkOutLat: z.number().finite().optional(),
  checkOutLng: z.number().finite().optional(),
  status: attendanceStatusSchema.optional(),
  notes: z.string().trim().max(4000).optional(),
  approvalStatus: approvalStatusSchema.optional(),
  attachment: z.string().trim().max(4000).optional(),
  projectId: z.string().trim().min(1).optional(),
  lat: z.number().finite().optional(),
  lng: z.number().finite().optional(),
});

const closeDaySchema = z.object({
  date: isoDateSchema.optional(),
});

const employeeWriteSchema = z
  .object({
    id: z.string().trim().optional().or(z.literal('')),
    eid: z.string().trim().max(100).optional().or(z.literal('')),
    name: z.string().trim().min(1, 'Name is required').max(200),
    username: z.string().trim().min(1, 'Username is required').max(200),
    password: z.string().max(500).optional().or(z.literal('')),
    email: z.string().trim().max(200).optional().or(z.literal('')),
    phone: z.string().trim().max(50).optional().or(z.literal('')),
    groupId: z.string().trim().max(100).optional().or(z.literal('')),
    workStart: z.string().trim().max(10).optional().or(z.literal('')),
    workEnd: z.string().trim().max(10).optional().or(z.literal('')),
    salary: z.coerce.number().optional(),
    active: z.boolean().optional(),
    departmentId: z.string().trim().max(100).optional().or(z.literal('')),
    jobTitle: z.string().trim().max(200).optional().or(z.literal('')),
    hireDate: z.string().trim().max(20).optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    const hasId = data.id && String(data.id).trim().length > 0;
    if (!hasId && (!data.password || String(data.password).trim().length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Password is required for new employees',
        path: ['password'],
      });
    }
  });

const adminCredentialsSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required').max(500),
    newUsername: z.string().trim().min(1, 'Username is required').max(200),
    newPassword: z.string().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    const np = (data.newPassword ?? '').trim();
    if (np.length > 0 && np.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'New password must be at least 8 characters',
        path: ['newPassword'],
      });
    }
  });

function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const msg = Object.values(first).flat()[0] || 'Invalid input';
      return res.status(400).json({ msg });
    }
    req.body = parsed.data;
    next();
  };
}

function validateQuery(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const msg = Object.values(first).flat()[0] || 'Invalid query';
      return res.status(400).json({ msg });
    }
    req.query = parsed.data;
    next();
  };
}

module.exports = {
  loginSchema,
  attendanceUpsertSchema,
  closeDaySchema,
  employeeWriteSchema,
  adminCredentialsSchema,
  validateBody,
  validateQuery,
};
