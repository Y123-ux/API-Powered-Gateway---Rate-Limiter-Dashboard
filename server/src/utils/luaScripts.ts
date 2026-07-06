// Token Bucket Algorithm - Atomic Redis Lua Script
// Performs check + refill + consume in a single EVAL call
// KEYS[1] = bucket key
// ARGV[1] = maxTokens, ARGV[2] = refillRate, ARGV[3] = refillIntervalMs
// ARGV[4] = now (timestamp ms), ARGV[5] = burstAllowance
export const TOKEN_BUCKET_SCRIPT = `
local bucketKey = KEYS[1]
local maxTokens = tonumber(ARGV[1])
local refillRate = tonumber(ARGV[2])
local refillIntervalMs = tonumber(ARGV[3])
local now = tonumber(ARGV[4])
local burstAllowance = tonumber(ARGV[5])

local capacity = maxTokens + burstAllowance
local bucket = redis.call('HMGET', bucketKey, 'tokens', 'lastRefill')
local tokens = tonumber(bucket[1])
local lastRefill = tonumber(bucket[2])

if tokens == nil then
  tokens = capacity
  lastRefill = now
end

-- Calculate refill
local elapsed = now - lastRefill
if elapsed > 0 and refillIntervalMs > 0 then
  local intervals = math.floor(elapsed / refillIntervalMs)
  if intervals > 0 then
    local tokensToAdd = intervals * refillRate
    tokens = math.min(tokens + tokensToAdd, capacity)
    lastRefill = lastRefill + (intervals * refillIntervalMs)
  end
end

-- Try to consume one token
if tokens >= 1 then
  tokens = tokens - 1
  redis.call('HMSET', bucketKey, 'tokens', tokens, 'lastRefill', lastRefill)
  redis.call('EXPIRE', bucketKey, 3600)
  return {1, tokens, capacity, 0}
else
  redis.call('HMSET', bucketKey, 'tokens', tokens, 'lastRefill', lastRefill)
  redis.call('EXPIRE', bucketKey, 3600)
  local retryAfterMs = refillIntervalMs - (now - lastRefill)
  if retryAfterMs < 0 then retryAfterMs = refillIntervalMs end
  return {0, 0, capacity, retryAfterMs}
end
`;
