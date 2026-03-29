/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
module.exports = {
  docsSidebar: [
    'index',
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: ['getting-started/overview', 'getting-started/installation', 'getting-started/quickstart']
    },
    {
      type: 'category',
      label: 'Guides',
      items: ['guides/scheduling-and-startup', 'guides/agent-operations']
    },
    {
      type: 'category',
      label: 'Reference',
      items: [
        'reference/cli-reference',
        'reference/database-schema',
        'reference/commands/job',
        'reference/commands/settings',
        'reference/commands/daemon',
        'reference/commands/startup',
        'reference/commands/export',
        'reference/commands/analytics',
        'reference/commands/logs',
        'reference/commands/errors',
        'reference/commands/doctor'
      ]
    },
    {
      type: 'category',
      label: 'Technical',
      items: ['technical/security', 'technical/e2e-testing']
    },
    {
      type: 'category',
      label: 'Contributing',
      items: ['contributing/development', 'contributing/releasing-and-docs-deploy']
    }
  ]
};
