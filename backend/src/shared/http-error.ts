export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  code?: string;
  details?: unknown;

  constructor(message: string, statusCode = 500, options?: { code?: string; details?: unknown }) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = options?.code;
    this.details = options?.details;
    Error.captureStackTrace(this, this.constructor);
  }
}
