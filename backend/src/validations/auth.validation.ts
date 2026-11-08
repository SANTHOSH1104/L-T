import * as yup from 'yup';

export const loginSchema = yup.object({
  email: yup
    .string()
    .trim()
    .email('Please provide a valid email address')
    .required('Email is required'),
  password: yup
    .string()
    .trim()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
});

export type LoginInput = yup.InferType<typeof loginSchema>;

