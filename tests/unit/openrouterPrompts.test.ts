import { buildClarificationPrompt, buildSpecPrompt } from '../../src/services/openrouter/prompts.js';

describe('openrouter prompts', () => {
  it('builds clarification prompt with schema and user criteria', () => {
    const prompt = buildClarificationPrompt('Track founders asking for GTM help');

    expect(prompt).toContain('automated Reddit monitoring system');
    expect(prompt).toContain('{"questions":[{"id":"q1","question":"..."}]}');
    expect(prompt).toContain('User criteria: Track founders asking for GTM help');
  });

  it('builds spec prompt with clarifications and output schema', () => {
    const prompt = buildSpecPrompt('Find hiring posts', [
      { question: 'Seniority?', answer: 'Senior IC roles only' },
      { question: 'Location?', answer: 'Remote only' }
    ]);

    expect(prompt).toContain('Return strict JSON only with this schema:');
    expect(prompt).toContain('suggestedSubreddits');
    expect(prompt).toContain('Original criteria: Find hiring posts');
    expect(prompt).toContain('Senior IC roles only');
  });
});