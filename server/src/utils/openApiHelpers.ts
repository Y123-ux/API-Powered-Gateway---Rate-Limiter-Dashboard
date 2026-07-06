import type { TrafficLog } from '../types/index.js';

interface GroupedPattern {
  method: string;
  pathPattern: string;
  examples: Array<{
    path: string;
    requestBody: unknown;
    responseStatus: number;
    responseBody: unknown;
    requestHeaders: Record<string, string>;
    responseHeaders: Record<string, string>;
  }>;
  statusCodes: number[];
}

// Normalize paths: replace numeric IDs and UUIDs with parameters
function normalizePath(path: string): string {
  return path
    .split('/')
    .map((segment) => {
      if (/^\d+$/.test(segment)) return '{id}';
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment))
        return '{uuid}';
      return segment;
    })
    .join('/');
}

export function groupTrafficPatterns(logs: TrafficLog[]): GroupedPattern[] {
  const groups = new Map<string, GroupedPattern>();

  for (const log of logs) {
    const pathPattern = normalizePath(log.path);
    const key = `${log.method}:${pathPattern}`;

    if (!groups.has(key)) {
      groups.set(key, {
        method: log.method,
        pathPattern,
        examples: [],
        statusCodes: [],
      });
    }

    const group = groups.get(key)!;

    if (group.examples.length < 3) {
      group.examples.push({
        path: log.path,
        requestBody: log.requestBody,
        responseStatus: log.responseStatus,
        responseBody: log.responseBody,
        requestHeaders: log.requestHeaders,
        responseHeaders: log.responseHeaders,
      });
    }

    if (!group.statusCodes.includes(log.responseStatus)) {
      group.statusCodes.push(log.responseStatus);
    }
  }

  return Array.from(groups.values());
}

export function buildDocGenerationPrompt(
  patterns: GroupedPattern[],
  upstreamName: string
): string {
  return `You are an API documentation expert. Based on the following captured HTTP traffic patterns from the "${upstreamName}" API, generate a complete OpenAPI 3.0 specification in JSON format.

Traffic Patterns:
${JSON.stringify(patterns, null, 2)}

Requirements:
- Infer path parameters (e.g., /users/123 -> /users/{id})
- Infer request/response schemas from body examples
- Include all observed status codes with descriptions
- Add meaningful descriptions for each endpoint
- Use proper OpenAPI 3.0 structure
- Include a relevant info section with title and description

Return ONLY valid JSON (OpenAPI 3.0 spec), no markdown or extra text.`;
}
