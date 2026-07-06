import type { RedisClientType } from 'redis';
import type OpenAI from 'openai';
import { v4 as uuid } from 'uuid';
import type { ApiDoc } from '../types/index.js';
import { env } from '../config/env.js';
import TrafficService from './trafficService.js';
import RealtimeService from './realtimeService.js';
import { groupTrafficPatterns, buildDocGenerationPrompt } from '../utils/openApiHelpers.js';

class DocGenerationService {
  constructor(
    private redis: RedisClientType,
    private openai: OpenAI,
    private trafficService: TrafficService
  ) {}

  async generate(upstreamId: string, sampleSize = 100): Promise<ApiDoc> {
    const realtime = RealtimeService.getInstance();

    // 1. Collect traffic logs
    realtime.emitDocProgress({
      stage: 'collecting',
      percent: 10,
      message: 'Collecting traffic samples...',
    });

    const logs = await this.trafficService.getByUpstream(upstreamId, sampleSize);
    if (logs.length === 0) {
      throw new Error(`No traffic logs found for upstream "${upstreamId}". Send some requests through the gateway first.`);
    }

    // 2. Analyze patterns
    realtime.emitDocProgress({
      stage: 'analyzing',
      percent: 30,
      message: `Analyzing ${logs.length} traffic patterns...`,
    });

    const patterns = groupTrafficPatterns(logs);

    // 3. Generate via OpenAI
    realtime.emitDocProgress({
      stage: 'generating',
      percent: 50,
      message: 'Generating OpenAPI spec with GPT...',
    });

    const prompt = buildDocGenerationPrompt(patterns, upstreamId);

    const completion = await this.openai.chat.completions.create({
      model: env.OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an API documentation expert. Generate valid OpenAPI 3.0 JSON specs.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const specText = completion.choices[0]?.message?.content;
    if (!specText) throw new Error('OpenAI returned empty response');

    // 4. Validate and store
    realtime.emitDocProgress({
      stage: 'validating',
      percent: 90,
      message: 'Validating generated spec...',
    });

    let openApiSpec: object;
    try {
      openApiSpec = JSON.parse(specText);
    } catch {
      throw new Error('OpenAI returned invalid JSON');
    }

    // Get version number
    const existingDocs = await this.getByUpstream(upstreamId);
    const version = `v${existingDocs.length + 1}`;

    const doc: ApiDoc = {
      id: uuid(),
      upstreamTarget: upstreamId,
      version,
      openApiSpec,
      trafficSampleCount: logs.length,
      generatedAt: Date.now(),
      promptTokensUsed: completion.usage?.prompt_tokens || 0,
      completionTokensUsed: completion.usage?.completion_tokens || 0,
    };

    // Store in Redis
    await this.redis.set(`docs:${doc.id}`, JSON.stringify(doc));
    await this.redis.zAdd('docs:index', { score: doc.generatedAt, value: doc.id });

    realtime.emitDocProgress({ stage: 'complete', percent: 100, message: 'Done!' });
    realtime.emitDocComplete(doc);

    return doc;
  }

  async getAll(): Promise<ApiDoc[]> {
    const ids = await this.redis.zRange('docs:index', 0, -1, { REV: true });
    const docs: ApiDoc[] = [];

    for (const id of ids) {
      const data = await this.redis.get(`docs:${id}`);
      if (data) docs.push(JSON.parse(data));
    }

    return docs;
  }

  async getById(docId: string): Promise<ApiDoc | null> {
    const data = await this.redis.get(`docs:${docId}`);
    return data ? JSON.parse(data) : null;
  }

  async getByUpstream(upstreamId: string): Promise<ApiDoc[]> {
    const all = await this.getAll();
    return all.filter((d) => d.upstreamTarget === upstreamId);
  }

  async delete(docId: string): Promise<boolean> {
    const result = await this.redis.del(`docs:${docId}`);
    if (result > 0) {
      await this.redis.zRem('docs:index', docId);
      return true;
    }
    return false;
  }
}

export default DocGenerationService;
