export interface Job {
  id: string;
  slug: string;
  name: string;
  description: string;
  qualificationPrompt: string;
  subreddits: string[];
  scheduleCron: string;
  enabled: boolean;
  monitorComments: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NewJob {
  slug?: string;
  name: string;
  description: string;
  qualificationPrompt: string;
  subreddits: string[];
  scheduleCron?: string;
  enabled?: boolean;
  monitorComments?: boolean;
}

export interface GeneratedJobSpec {
  name: string;
  slug: string;
  description: string;
  qualificationPrompt: string;
  suggestedSubreddits: string[];
}

export interface ClarificationQuestion {
  id: string;
  question: string;
}
