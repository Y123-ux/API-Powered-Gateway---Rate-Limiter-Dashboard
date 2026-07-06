import type { Request, Response } from 'express';
import DocGenerationService from '../services/docGenerationService.js';

export function createDocsController(docService: DocGenerationService) {
  return {
    async generate(req: Request, res: Response): Promise<void> {
      try {
        const { upstreamId, sampleSize } = req.body;

        if (!upstreamId) {
          res.status(400).json({ error: 'upstreamId is required' });
          return;
        }

        const doc = await docService.generate(upstreamId, sampleSize);
        res.status(201).json(doc);
      } catch (err: any) {
        res.status(500).json({ error: err.message || 'Failed to generate documentation' });
      }
    },

    async getAll(_req: Request, res: Response): Promise<void> {
      try {
        const docs = await docService.getAll();
        res.json(docs);
      } catch (err) {
        res.status(500).json({ error: 'Failed to fetch documentation' });
      }
    },

    async getById(req: Request, res: Response): Promise<void> {
      try {
        const doc = await docService.getById(req.params.docId as string);
        if (!doc) {
          res.status(404).json({ error: 'Document not found' });
          return;
        }
        res.json(doc);
      } catch (err) {
        res.status(500).json({ error: 'Failed to fetch document' });
      }
    },

    async delete(req: Request, res: Response): Promise<void> {
      try {
        const deleted = await docService.delete(req.params.docId as string);
        if (!deleted) {
          res.status(404).json({ error: 'Document not found' });
          return;
        }
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: 'Failed to delete document' });
      }
    },
  };
}
