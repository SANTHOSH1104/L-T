import { Request, Response, NextFunction } from 'express';
import { AnyObjectSchema, ValidationError } from 'yup';

export const validate = (schema: AnyObjectSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate and strip/trim unknown fields
      const validated = await schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });
      req.body = validated;
      next();
    } catch (err) {
      if (err instanceof ValidationError) {
        const errors: Record<string, string> = {};
        err.inner.forEach((error) => {
          if (error.path) {
            errors[error.path] = error.message;
          }
        });
        res.status(400).json({
          success: false,
          message: 'Validation failed on submitted data',
          errors,
        });
        return;
      }
      res.status(500).json({ success: false, message: 'Internal validation error' });
    }
  };
};

