const { z } = require('zod');

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required').max(200),
  password: z.string().min(1, 'Password is required').max(500),
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

module.exports = {
  loginSchema,
  employeeWriteSchema,
  validateBody,
};
