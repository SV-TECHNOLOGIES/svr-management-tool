import { Response } from 'express';

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const badRequest = (msg: string) => new HttpError(400, msg);
export const notFound = (msg: string) => new HttpError(404, msg);

/** Send an error from a service call as a JSON response. */
export const sendError = (res: Response, error: unknown, fallback: string) => {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message });
  }
  const code = (error as { code?: string })?.code;
  if (code === 'P2025') {
    return res.status(404).json({ error: 'Record not found' });
  }
  console.error(fallback, error);
  return res.status(500).json({ error: fallback });
};

/** Wrap an async handler so service errors become JSON responses. */
export const handle =
  (fallback: string, fn: (req: any, res: Response) => Promise<unknown>) =>
  async (req: any, res: Response) => {
    try {
      const result = await fn(req, res);
      if (!res.headersSent) res.json(result);
    } catch (error) {
      sendError(res, error, fallback);
    }
  };
