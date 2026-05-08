import React from 'react';
import { render } from 'ink';
import { AppFrame, Panel } from '../../ui/components/AppFrame.js';
import { MultilinePrompt } from '../../ui/components/MultilinePrompt.js';

export async function editPromptInteractively(initialValue: string): Promise<string | null> {
  let result: string | null = null;

  const app = render(
    <AppFrame subtitle="Prompt" statusText="Interactive editor" statusTone="info" hints={['Enter submit', 'Shift+Enter newline', 'Esc cancel']}>
      <Panel title="Edit Qualification Prompt">
        <MultilinePrompt
          label="Qualification prompt"
          initialValue={initialValue}
          rows={10}
          onSubmit={(value) => {
            result = value;
            app.unmount();
          }}
          onCancel={() => {
            result = null;
            app.unmount();
          }}
        />
      </Panel>
    </AppFrame>
  );

  await app.waitUntilExit();
  return result;
}
