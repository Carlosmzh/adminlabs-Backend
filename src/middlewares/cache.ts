import { Request, Response, NextFunction } from 'express';
import { getCached, setCache } from '../lib/cache';

export function swrCache(prefix: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const cacheKey = `${prefix}:${req.originalUrl}`;
    const cached = getCached<unknown>(cacheKey);

    if (cached) {
      if (cached.isFresh) {
        res.json(cached.data);
        return;
      }
      res.json(cached.data);
      res.on('finish', () => {
        next();
      });
      return;
    }

    const originalJson = res.json.bind(res);
    res.json = function (body: unknown) {
      setCache(cacheKey, body);
      return originalJson(body);
    };

    next();
  };
}
