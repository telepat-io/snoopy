const SYSTEM_CONTEXT = `\
You are configuring a job for an automated Reddit monitoring system.
How the system works:
- The user defines monitoring jobs, each with a set of subreddits and a qualification prompt.
- Every 30 minutes, the system fetches all new posts and comments from those subreddits.
- Each post/comment is individually evaluated by an LLM using the job's qualification prompt.
- Items that pass are surfaced to the user as relevant matches.
The goal is to capture content the user genuinely cares about while filtering out noise.`;

export function buildClarificationPrompt(criteria: string): string {
  return [
    SYSTEM_CONTEXT,
    '',
    'The user has described what they want to monitor. Ask 2 to 4 short clarification questions',
    'that will help you write a precise, effective qualification prompt later.',
    'Focus on intent, signal vs. noise, and edge cases — not on which subreddits to watch',
    '(subreddits are configured separately).',
    '',
    'Output only JSON with this exact schema:',
    '{"questions":[{"id":"q1","question":"..."}]}',
    '',
    `User criteria: ${criteria}`
  ].join('\n');
}

export function buildSpecPrompt(criteria: string, answers: Array<{ question: string; answer: string }>): string {
  return [
    SYSTEM_CONTEXT,
    '',
    'Using the user criteria and their answers to the clarification questions, produce a monitoring job spec.',
    '',
    'The most important field is qualificationPrompt — this is the exact prompt that will be prepended',
    'to each Reddit post or comment and sent to an LLM to decide whether that content is a match.',
    'It should be written in second-person imperative ("Decide whether this post…"), be specific about',
    'what counts as a match vs. not a match, and be resilient to tangential or off-topic content.',
    '',
    'Return strict JSON only with this schema:',
    '{"name":"...","slug":"...","description":"...","qualificationPrompt":"...","suggestedSubreddits":["sub1","sub2"]}',
    '',
    'Rules:',
    '- slug: a memorable, scannable identifier for this job shown in job listings (e.g. "ai-funding-rounds", "rust-job-postings"). kebab-case, lowercase, 2-40 chars, letters/numbers/hyphens only.',
    '- description: one tight sentence a user can read at a glance to know exactly what this job is watching for. Prefer active phrasing, e.g. "Monitors posts asking for SaaS tool recommendations" rather than generic summaries.',
    '- qualificationPrompt: 2-5 sentences; precise, actionable, unambiguous.',
    '- suggestedSubreddits: 3 to 8 relevant subreddit names without the r/ prefix.',
    '',
    `Original criteria: ${criteria}`,
    `Clarifications: ${JSON.stringify(answers)}`
  ].join('\n');
}
