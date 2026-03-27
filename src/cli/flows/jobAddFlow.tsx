import React, { useEffect, useMemo, useState } from 'react';
import { Text, useApp } from 'ink';
import { Spinner } from '@inkjs/ui';
import { TextPrompt } from '../../ui/components/TextPrompt.js';
import { YesNoSelector } from '../../ui/components/YesNoSelector.js';
import { SubredditMultiSelect } from '../../ui/components/SubredditMultiSelect.js';
import { AppFrame, Panel } from '../../ui/components/AppFrame.js';
import { OpenRouterClient, OpenRouterClientError } from '../../services/openrouter/client.js';
import type { GeneratedJobSpec } from '../../types/job.js';
import type { AppSettings } from '../../types/settings.js';
import { DEFAULT_MODEL } from '../../types/settings.js';
import { uiTheme } from '../../ui/theme.js';

interface JobAddResult {
  apiKey?: string;
  installStartup?: boolean;
  settings: AppSettings;
  job: {
    slug: string;
    name: string;
    description: string;
    qualificationPrompt: string;
    subreddits: string[];
    monitorComments: boolean;
  };
}

interface JobAddFlowProps {
  hasApiKey: boolean;
  existingApiKey: string | null;
  startupAlreadyEnabled: boolean;
  initialSettings: AppSettings;
  onApiKeyCaptured?: (apiKey: string) => Promise<void> | void;
  onAuthFailure?: () => Promise<void> | void;
  onDone: (result: JobAddResult) => void;
}

type Stage =
  | 'criteria'
  | 'apiKey'
  | 'model'
  | 'clarifying'
  | 'clarifications'
  | 'generating'
  | 'subreddits'
  | 'monitorComments'
  | 'confirm'
  | 'startup'
  | 'error';

interface TranscriptEntry {
  label: string;
  value: string;
  muted?: boolean;
}

interface FlowFrameProps {
  transcript: TranscriptEntry[];
  children: React.ReactNode;
  statusText?: string;
  statusTone?: 'info' | 'success' | 'warning' | 'danger';
}

function FlowFrame({ transcript, children, statusText, statusTone = 'info' }: FlowFrameProps): React.JSX.Element {
  return (
    <AppFrame
      subtitle="Add job wizard"
      statusText={statusText}
      statusTone={statusTone}
      hints={['Enter: confirm', 'Esc: cancel current step']}
    >
      {transcript.length > 0 ? (
        <Panel title="Session Transcript">
          {transcript.map((entry, index) => (
            <Text key={`${entry.label}-${index}`} color={entry.muted ? uiTheme.ink.textMuted : uiTheme.ink.textPrimary}>
              <Text color={uiTheme.ink.accent}>{entry.label}:</Text> {entry.value}
            </Text>
          ))}
        </Panel>
      ) : null}
      {children}
    </AppFrame>
  );
}

export function JobAddFlow({
  hasApiKey,
  existingApiKey,
  startupAlreadyEnabled,
  initialSettings,
  onApiKeyCaptured,
  onAuthFailure,
  onDone
}: JobAddFlowProps): React.JSX.Element {
  const defaultModel = initialSettings.model.trim() || DEFAULT_MODEL;
  const { exit } = useApp();
  const [stage, setStage] = useState<Stage>('criteria');
  const [criteria, setCriteria] = useState('');
  const [apiKey, setApiKey] = useState<string | undefined>(undefined);
  const [model, setModel] = useState(defaultModel);
  const [questions, setQuestions] = useState<Array<{ id: string; question: string }>>([]);
  const [answers, setAnswers] = useState<Array<{ question: string; answer: string }>>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [spec, setSpec] = useState<GeneratedJobSpec | null>(null);
  const [selectedSubreddits, setSelectedSubreddits] = useState<string[]>([]);
  const [monitorComments, setMonitorComments] = useState(true);
  const [pendingResult, setPendingResult] = useState<JobAddResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingLabel, setLoadingLabel] = useState('Talking to model...');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);

  const currentQuestion = useMemo(() => questions[questionIndex], [questions, questionIndex]);

  const appendTranscript = (label: string, value: string, muted = false): void => {
    setTranscript((previous) => [...previous, { label, value, muted }]);
  };

  useEffect(() => {
    if (stage !== 'generating') {
      return;
    }

    const run = async (): Promise<void> => {
      try {
        const keyToUse = hasApiKey ? existingApiKey : apiKey;
        if (!keyToUse) {
          throw new Error('Missing API key');
        }

        const client = new OpenRouterClient(keyToUse);
        const generated = await client.generateJobSpec(criteria, answers, model.trim() || defaultModel);
        appendTranscript('Generated name', generated.name);
        appendTranscript('Generated slug', generated.slug);
        appendTranscript('Generated description', generated.description);
        setSpec(generated);
        setStage('subreddits');
      } catch (error) {
        if (error instanceof OpenRouterClientError && error.kind === 'auth') {
          await onAuthFailure?.();
        }
        setErrorMessage(error instanceof Error ? error.message : 'Failed to generate job spec.');
        appendTranscript('OpenRouter', 'Failed to generate job spec', true);
        setStage('error');
      }
    };

    void run();
  }, [answers, apiKey, criteria, defaultModel, existingApiKey, hasApiKey, model, onAuthFailure, stage]);

  useEffect(() => {
    if (stage !== 'error') {
      return;
    }

    const timeoutId = setTimeout(() => {
      exit();
    }, 1200);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [exit, stage]);

  const beginClarification = async (): Promise<void> => {
    setLoadingLabel('Generating clarification questions...');
    setStage('clarifying');

    try {
      const keyToUse = hasApiKey ? existingApiKey : apiKey;
      if (!keyToUse) {
        throw new Error('Missing API key');
      }

      const client = new OpenRouterClient(keyToUse);
      const generatedQuestions = await client.generateClarificationQuestions(criteria, model.trim() || defaultModel);
      setQuestions(generatedQuestions);
      appendTranscript('Snoopy', `Generated ${generatedQuestions.length} clarification question(s).`, true);
      setStage('clarifications');
    } catch (error) {
      if (error instanceof OpenRouterClientError && error.kind === 'auth') {
        await onAuthFailure?.();
      }
      setErrorMessage(error instanceof Error ? error.message : 'Failed to generate clarification questions.');
      appendTranscript('OpenRouter', 'Failed to generate clarification questions', true);
      setStage('error');
    }
  };

  if (stage === 'criteria') {
    return (
      <FlowFrame transcript={transcript} statusText="Define monitoring criteria" statusTone="info">
        <Panel title="Step 1: Criteria">
          <TextPrompt
            label="Describe the conversations you want to monitor"
            onSubmit={(value) => {
              setCriteria(value);
              appendTranscript('Criteria', value);
              setStage(hasApiKey ? 'model' : 'apiKey');
            }}
          />
        </Panel>
      </FlowFrame>
    );
  }

  if (stage === 'apiKey') {
    return (
      <FlowFrame transcript={transcript} statusText="First-time setup required" statusTone="warning">
        <Panel title="Step 2: Authentication">
          <Text color={uiTheme.ink.warning}>First-time setup: OpenRouter API key required.</Text>
          <TextPrompt
            label="Paste OpenRouter API key"
            secret
            onSubmit={(value) => {
              setApiKey(value);
              appendTranscript('OpenRouter API key', '********');
              void onApiKeyCaptured?.(value);
              setStage('model');
            }}
          />
        </Panel>
      </FlowFrame>
    );
  }

  if (stage === 'model') {
    return (
      <FlowFrame transcript={transcript} statusText="Choose model" statusTone="info">
        <Panel title="Step 3: Model">
          <Text color={uiTheme.ink.warning}>Model selection (default moonshotai/kimi-k2.5)</Text>
          <TextPrompt
            label="Model ID"
            initialValue={model.trim() || defaultModel}
            onSubmit={(value) => {
              const chosenModel = value.trim() || defaultModel;
              setModel(chosenModel);
              appendTranscript('Model', chosenModel);
              void beginClarification();
            }}
          />
        </Panel>
      </FlowFrame>
    );
  }

  if (stage === 'clarifying') {
    return (
      <FlowFrame transcript={transcript} statusText="Generating clarification questions" statusTone="info">
        <Spinner label={loadingLabel} />
        <Text color={uiTheme.ink.textMuted}>Snoopy is coming up with follow-up questions.</Text>
      </FlowFrame>
    );
  }

  if (stage === 'clarifications' && currentQuestion) {
    return (
      <FlowFrame transcript={transcript} statusText={`Clarification ${questionIndex + 1}/${questions.length}`} statusTone="info">
        <Panel title="Step 4: Clarifications">
          <Text color={uiTheme.ink.accent}>Clarification {questionIndex + 1}/{questions.length}</Text>
          <TextPrompt
            label={currentQuestion.question}
            onSubmit={(value) => {
              appendTranscript(`Q${questionIndex + 1}`, `${currentQuestion.question} -> ${value}`);
              const next = [...answers, { question: currentQuestion.question, answer: value }];
              setAnswers(next);
              const nextIndex = questionIndex + 1;
              if (nextIndex < questions.length) {
                setQuestionIndex(nextIndex);
              } else {
                setLoadingLabel('Generating job artifacts...');
                setStage('generating');
              }
            }}
          />
        </Panel>
      </FlowFrame>
    );
  }

  if (stage === 'generating') {
    return (
      <FlowFrame transcript={transcript} statusText="Generating job artifacts" statusTone="info">
        <Spinner label={loadingLabel} />
        <Text color={uiTheme.ink.textMuted}>Snoopy is generating the job name, slug, prompt, and subreddit suggestions.</Text>
      </FlowFrame>
    );
  }

  if (stage === 'subreddits' && spec) {
    return (
      <FlowFrame transcript={transcript} statusText="Review generated job draft" statusTone="success">
        <Panel title="Step 5: Subreddits">
          <Text color={uiTheme.ink.success}>Generated name: {spec.name}</Text>
          <Text color={uiTheme.ink.success}>Generated slug: {spec.slug}</Text>
          <Text color={uiTheme.ink.success}>Generated description: {spec.description}</Text>
          <Text color={uiTheme.ink.textMuted}>Prompt: {spec.qualificationPrompt}</Text>
          <SubredditMultiSelect
            options={spec.suggestedSubreddits}
            onDone={(subreddits) => {
              setSelectedSubreddits(subreddits);
              appendTranscript('Subreddits', subreddits.map((subreddit) => `r/${subreddit}`).join(', '));
              setStage('monitorComments');
            }}
          />
        </Panel>
      </FlowFrame>
    );
  }

  if (stage === 'monitorComments') {
    return (
      <FlowFrame transcript={transcript} statusText="Choose comment monitoring" statusTone="info">
        <Panel title="Step 6: Comment Coverage">
          <YesNoSelector
            label="Also monitor comments in these subreddits?"
            defaultValue
            onSubmit={(shouldMonitorComments) => {
              setMonitorComments(shouldMonitorComments);
              appendTranscript('Monitor comments', shouldMonitorComments ? 'yes' : 'no');
              setStage('confirm');
            }}
          />
        </Panel>
      </FlowFrame>
    );
  }

  if (stage === 'confirm' && spec) {
    return (
      <FlowFrame transcript={transcript} statusText="Confirm generated job" statusTone="success">
        <Panel title="Step 7: Review">
          <Text color={uiTheme.ink.success} bold>Review</Text>
          <Text>Name: {spec.name}</Text>
          <Text>Slug: {spec.slug}</Text>
          <Text>Description: {spec.description}</Text>
          <Text>Subreddits: {selectedSubreddits.join(', ')}</Text>
          <Text>Monitor comments: {monitorComments ? 'yes' : 'no'}</Text>
          <YesNoSelector
            label="Save this job?"
            defaultValue
            onSubmit={(shouldSave) => {
              if (shouldSave) {
                appendTranscript('Save job', 'yes');
                const result: JobAddResult = {
                  apiKey,
                  settings: {
                    model,
                    modelSettings: initialSettings.modelSettings,
                    cronIntervalMinutes: initialSettings.cronIntervalMinutes,
                    jobTimeoutMs: initialSettings.jobTimeoutMs,
                    notificationsEnabled: initialSettings.notificationsEnabled
                  },
                  job: {
                    slug: spec.slug,
                    name: spec.name,
                    description: spec.description,
                    qualificationPrompt: spec.qualificationPrompt,
                    subreddits: selectedSubreddits,
                    monitorComments
                  }
                };

                if (startupAlreadyEnabled) {
                  onDone(result);
                  exit();
                  return;
                }

                setPendingResult(result);
                setStage('startup');
                return;
              } else {
                appendTranscript('Save job', 'no', true);
              }
              exit();
            }}
          />
        </Panel>
      </FlowFrame>
    );
  }

  if (stage === 'startup' && pendingResult) {
    return (
      <FlowFrame transcript={transcript} statusText="Startup registration" statusTone="info">
        <Panel title="Step 8: Startup Behavior">
          <YesNoSelector
            label="Install OS startup registration so daemon survives reboot?"
            defaultValue
            onSubmit={(shouldInstallStartup) => {
              appendTranscript('Install startup registration', shouldInstallStartup ? 'yes' : 'no');
              onDone({
                ...pendingResult,
                installStartup: shouldInstallStartup
              });
              exit();
            }}
          />
        </Panel>
      </FlowFrame>
    );
  }

  if (stage === 'error') {
    return (
      <FlowFrame transcript={transcript} statusText="OpenRouter request failed" statusTone="danger">
        <Panel title="Error">
          <Text color={uiTheme.ink.danger} bold>OpenRouter request failed</Text>
          <Text>{errorMessage ?? 'Unknown error.'}</Text>
          <Text color={uiTheme.ink.textMuted}>Update your API key or model and try again. Exiting...</Text>
        </Panel>
      </FlowFrame>
    );
  }

  return (
    <FlowFrame transcript={transcript} statusText="Loading" statusTone="info">
      <Text>Loading...</Text>
    </FlowFrame>
  );
}
