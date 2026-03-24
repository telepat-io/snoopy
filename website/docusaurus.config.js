const githubOwner = process.env.GITHUB_OWNER || 'cozymantis';
const githubRepo = process.env.GITHUB_REPO || 'snoopy';
const localMode = process.env.DOCS_LOCAL === 'true';

const url = localMode ? 'http://localhost' : process.env.DOCS_URL || `https://${githubOwner}.github.io`;
const baseUrl = localMode ? '/' : process.env.DOCS_BASE_URL || `/${githubRepo}/`;

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Snoopy Docs',
  tagline: 'Documentation for Reddit monitoring with Snoopy',
  url,
  baseUrl,
  organizationName: githubOwner,
  projectName: githubRepo,
  deploymentBranch: process.env.GH_PAGES_BRANCH || 'gh-pages',
  trailingSlash: false,
  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'throw'
    }
  },
  favicon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22><text y=%2224%22 font-size=%2224%22>🕵️</text></svg>',
  presets: [
    [
      'classic',
      {
        docs: {
          path: '../docs',
          routeBasePath: '/',
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: `https://github.com/${githubOwner}/${githubRepo}/tree/main/`
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css')
        }
      }
    ]
  ],
  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true
    },
    navbar: {
      title: 'Snoopy Docs',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs'
        },
        {
          href: `https://github.com/${githubOwner}/${githubRepo}`,
          label: 'GitHub',
          position: 'right'
        }
      ]
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Command Reference',
              to: '/commands'
            },
            {
              label: 'Database Schema',
              to: '/database-schema'
            }
          ]
        },
        {
          title: 'Operations',
          items: [
            {
              label: 'Scheduling and Startup',
              to: '/scheduling-and-startup'
            },
            {
              label: 'E2E Smoke Testing',
              to: '/e2e-testing'
            }
          ]
        }
      ],
      copyright: `Copyright ${new Date().getFullYear()} Snoopy`
    },
    prism: {
      additionalLanguages: ['bash', 'sql', 'powershell']
    }
  }
};

module.exports = config;
