export interface ErrorDetail {
  field: string;
  message: string;
}

export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
    public details?: ErrorDetail[],
  ) {
    super(message);
  }
}