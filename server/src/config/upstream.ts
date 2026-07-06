import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { UpstreamConfig } from '../types/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

let upstreams: UpstreamConfig[] = [];

export function loadUpstreams(): UpstreamConfig[] {
  try {
    const filePath = join(__dirname, '../../data/upstreams.json');
    const data = readFileSync(filePath, 'utf-8');
    upstreams = JSON.parse(data);
    console.log(`[Upstream] Loaded ${upstreams.length} upstream(s)`);
  } catch {
    console.warn('[Upstream] No upstreams.json found, using empty config');
    upstreams = [];
  }
  return upstreams;
}

export function getUpstreams(): UpstreamConfig[] {
  return upstreams;
}

export function getUpstreamById(id: string): UpstreamConfig | undefined {
  return upstreams.find((u) => u.id === id);
}
