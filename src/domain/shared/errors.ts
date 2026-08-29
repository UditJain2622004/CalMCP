/**
 * Domain error types and error codes.
 */

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'CONFIRMATION_REQUIRED'
  | 'PROFILE_INCOMPLETE'
  | 'UNSUPPORTED'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export class DomainError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly fieldErrors?: Record<string, string>,
    public readonly recoverable: boolean = true,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export function isDomainError(err: unknown): err is DomainError {
  return err instanceof DomainError;
}

/**
 * Wraps any unknown error into a DomainError.
 */
export function toDomainError(err: unknown): DomainError {
  if (isDomainError(err)) return err;
  const msg = err instanceof Error ? err.message : String(err);
  return new DomainError('INTERNAL_ERROR', msg, undefined, false);
}
