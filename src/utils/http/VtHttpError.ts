export class VtHttpError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly bodyText?: string;

  constructor(message: string, args: { status: number; code?: string; bodyText?: string }) {
    super(message);
    this.name = "VtHttpError";
    this.status = args.status;
    this.code = args.code;
    this.bodyText = args.bodyText;
  }
}
