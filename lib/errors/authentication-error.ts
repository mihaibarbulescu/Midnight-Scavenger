export class AuthenticationError extends Error {
  readonly statusCode: number;

  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = 401;
  }
}

export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}
