/**
 * GitHub Service
 * Handles GitHub API operations for CI/CD integration
 * Provides repository analysis, file fetching, and status management
 */

const EventEmitter = require('events');

class GitHubService extends EventEmitter {
  constructor(options = {}) {
    super();
    this.logger = options.logger || console;
    this.token = options.token || process.env.GITHUB_TOKEN;
    this.baseUrl = 'https://api.github.com';
    
    if (!this.token) {
      this.logger.warn('GitHub token not provided - some features will be limited');
    }
    
    this.logger.info('GitHub Service initialized');
  }

  /**
   * Make authenticated request to GitHub API
   */
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Autonomous-Deploy-Agent/1.0',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `token ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`GitHub API error (${response.status}): ${error}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error('GitHub API request failed:', { endpoint, error: error.message });
      throw error;
    }
  }

  /**
   * Get repository information
   */
  async getRepository(owner, repo) {
    try {
      const repository = await this.makeRequest(`/repos/${owner}/${repo}`);
      
      return {
        id: repository.id,
        name: repository.name,
        fullName: repository.full_name,
        description: repository.description,
        language: repository.language,
        size: repository.size,
        private: repository.private,
        fork: repository.fork,
        defaultBranch: repository.default_branch,
        cloneUrl: repository.clone_url,
        sshUrl: repository.ssh_url,
        homepage: repository.homepage,
        topics: repository.topics,
        createdAt: repository.created_at,
        updatedAt: repository.updated_at,
        pushedAt: repository.pushed_at,
        stargazersCount: repository.stargazers_count,
        forksCount: repository.forks_count,
        openIssuesCount: repository.open_issues_count
      };
    } catch (error) {
      this.logger.error('Failed to get repository info:', { owner, repo, error: error.message });
      throw error;
    }
  }

  /**
   * Get repository contents (files and directories)
   */
  async getContents(owner, repo, path = '', ref = null) {
    try {
      const endpoint = `/repos/${owner}/${repo}/contents/${path}`;
      const params = ref ? `?ref=${ref}` : '';
      
      const contents = await this.makeRequest(`${endpoint}${params}`);
      
      if (Array.isArray(contents)) {
        // Directory listing
        return contents.map(item => ({
          name: item.name,
          path: item.path,
          type: item.type,
          size: item.size,
          sha: item.sha,
          downloadUrl: item.download_url
        }));
      } else {
        // Single file
        return {
          name: contents.name,
          path: contents.path,
          type: contents.type,
          size: contents.size,
          sha: contents.sha,
          content: contents.encoding === 'base64' 
            ? Buffer.from(contents.content, 'base64').toString('utf8')
            : contents.content,
          downloadUrl: contents.download_url
        };
      }
    } catch (error) {
      this.logger.error('Failed to get repository contents:', { owner, repo, path, error: error.message });
      throw error;
    }
  }

  /**
   * Analyze repository for deployment configuration
   */
  async analyzeRepository(owner, repo, ref = null) {
    try {
      this.logger.info('Analyzing repository for deployment:', { owner, repo, ref });
      
      const repository = await this.getRepository(owner, repo);
      const analysis = {
        repository,
        framework: null,
        language: repository.language,
        packageManager: null,
        buildTool: null,
        dependencies: [],
        scripts: {},
        deploymentConfig: null,
        dockerized: false,
        hasTests: false,
        hasCI: false
      };

      // Get root directory contents
      const rootContents = await this.getContents(owner, repo, '', ref);
      const fileNames = rootContents.map(item => item.name.toLowerCase());

      // Detect package manager and framework
      if (fileNames.includes('package.json')) {
        analysis.packageManager = 'npm';
        
        try {
          const packageJson = await this.getContents(owner, repo, 'package.json', ref);
          const pkg = JSON.parse(packageJson.content);
          
          analysis.scripts = pkg.scripts || {};
          analysis.dependencies = Object.keys(pkg.dependencies || {});
          
          // Detect framework
          if (analysis.dependencies.includes('react')) {
            analysis.framework = 'React';
          } else if (analysis.dependencies.includes('vue')) {
            analysis.framework = 'Vue.js';
          } else if (analysis.dependencies.includes('angular')) {
            analysis.framework = 'Angular';
          } else if (analysis.dependencies.includes('next')) {
            analysis.framework = 'Next.js';
          } else if (analysis.dependencies.includes('nuxt')) {
            analysis.framework = 'Nuxt.js';
          } else if (analysis.dependencies.includes('express')) {
            analysis.framework = 'Express.js';
          } else if (analysis.dependencies.includes('fastify')) {
            analysis.framework = 'Fastify';
          }
          
          // Check for Yarn
          if (fileNames.includes('yarn.lock')) {
            analysis.packageManager = 'yarn';
          } else if (fileNames.includes('pnpm-lock.yaml')) {
            analysis.packageManager = 'pnpm';
          }
          
        } catch (error) {
          this.logger.warn('Failed to parse package.json:', error.message);
        }
      }

      // Python projects
      if (fileNames.includes('requirements.txt') || fileNames.includes('pyproject.toml')) {
        analysis.packageManager = 'pip';
        
        if (fileNames.includes('manage.py')) {
          analysis.framework = 'Django';
        } else if (fileNames.includes('app.py') || fileNames.includes('main.py')) {
          // Try to detect Flask/FastAPI
          try {
            const appFile = fileNames.includes('app.py') ? 'app.py' : 'main.py';
            const content = await this.getContents(owner, repo, appFile, ref);
            
            if (content.content.includes('from flask')) {
              analysis.framework = 'Flask';
            } else if (content.content.includes('from fastapi')) {
              analysis.framework = 'FastAPI';
            }
          } catch (error) {
            this.logger.warn('Failed to analyze Python app file:', error.message);
          }
        }
      }

      // Java projects
      if (fileNames.includes('pom.xml')) {
        analysis.buildTool = 'Maven';
        analysis.packageManager = 'maven';
      } else if (fileNames.includes('build.gradle')) {
        analysis.buildTool = 'Gradle';
        analysis.packageManager = 'gradle';
      }

      // Ruby projects
      if (fileNames.includes('gemfile')) {
        analysis.packageManager = 'bundler';
        if (fileNames.includes('config.ru') || fileNames.includes('rakefile')) {
          analysis.framework = 'Rails';
        }
      }

      // Go projects
      if (fileNames.includes('go.mod')) {
        analysis.packageManager = 'go';
        analysis.framework = 'Go';
      }

      // Rust projects
      if (fileNames.includes('cargo.toml')) {
        analysis.packageManager = 'cargo';
        analysis.framework = 'Rust';
      }

      // Check for Docker
      analysis.dockerized = fileNames.includes('dockerfile') || fileNames.includes('.dockerignore');

      // Check for tests
      analysis.hasTests = fileNames.some(name => 
        name.includes('test') || 
        name.includes('spec') || 
        name === '__tests__' ||
        name === 'tests'
      );

      // Check for CI/CD
      analysis.hasCI = fileNames.includes('.github') || 
                      fileNames.includes('.gitlab-ci.yml') ||
                      fileNames.includes('.travis.yml') ||
                      fileNames.includes('jenkinsfile');

      // Check for deployment configuration files
      const deploymentFiles = [
        'vercel.json',
        'netlify.toml',
        'now.json',
        'app.yaml',
        'docker-compose.yml',
        'kubernetes.yaml',
        'k8s.yaml'
      ];

      for (const file of deploymentFiles) {
        if (fileNames.includes(file)) {
          try {
            const config = await this.getContents(owner, repo, file, ref);
            analysis.deploymentConfig = {
              type: file,
              content: config.content
            };
            break;
          } catch (error) {
            this.logger.warn(`Failed to read deployment config ${file}:`, error.message);
          }
        }
      }

      this.logger.info('Repository analysis completed:', {
        framework: analysis.framework,
        language: analysis.language,
        packageManager: analysis.packageManager,
        dockerized: analysis.dockerized
      });

      return analysis;
    } catch (error) {
      this.logger.error('Repository analysis failed:', { owner, repo, error: error.message });
      throw error;
    }
  }

  /**
   * Generate deployment configuration based on analysis
   */
  generateDeploymentConfig(analysis) {
    const config = {
      name: analysis.repository.name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      repository: {
        url: analysis.repository.cloneUrl,
        branch: analysis.repository.defaultBranch
      },
      build: {
        command: 'echo "No build command specified"',
        outputDirectory: '.',
        environment: {}
      },
      runtime: {
        command: 'echo "No start command specified"',
        port: 3000,
        environment: {}
      },
      infrastructure: {
        size: 'medium',
        instances: 1,
        autoScale: true
      },
      features: []
    };

    // Configure based on detected framework
    switch (analysis.framework) {
      case 'React':
        config.build.command = analysis.packageManager === 'yarn' ? 'yarn build' : 'npm run build';
        config.build.outputDirectory = 'build';
        config.runtime.command = 'npx serve -s build -l 3000';
        config.features.push('static-site');
        break;

      case 'Next.js':
        config.build.command = analysis.packageManager === 'yarn' ? 'yarn build' : 'npm run build';
        config.runtime.command = analysis.packageManager === 'yarn' ? 'yarn start' : 'npm start';
        config.features.push('ssr', 'api-routes');
        break;

      case 'Vue.js':
        config.build.command = analysis.packageManager === 'yarn' ? 'yarn build' : 'npm run build';
        config.build.outputDirectory = 'dist';
        config.runtime.command = 'npx serve -s dist -l 3000';
        config.features.push('static-site');
        break;

      case 'Express.js':
        config.build.command = 'npm install';
        config.runtime.command = 'npm start';
        config.features.push('api', 'backend');
        break;

      case 'Django':
        config.build.command = 'pip install -r requirements.txt';
        config.runtime.command = 'python manage.py runserver 0.0.0.0:8000';
        config.runtime.port = 8000;
        config.features.push('api', 'backend', 'database');
        break;

      case 'Flask':
        config.build.command = 'pip install -r requirements.txt';
        config.runtime.command = 'python app.py';
        config.runtime.port = 5000;
        config.features.push('api', 'backend');
        break;

      case 'FastAPI':
        config.build.command = 'pip install -r requirements.txt';
        config.runtime.command = 'uvicorn main:app --host 0.0.0.0 --port 8000';
        config.runtime.port = 8000;
        config.features.push('api', 'backend', 'openapi');
        break;

      case 'Rails':
        config.build.command = 'bundle install';
        config.runtime.command = 'rails server -b 0.0.0.0 -p 3000';
        config.features.push('api', 'backend', 'database');
        break;

      case 'Go':
        config.build.command = 'go build -o app';
        config.runtime.command = './app';
        config.runtime.port = 8080;
        config.features.push('api', 'backend');
        break;
    }

    // Adjust infrastructure based on features
    if (config.features.includes('database')) {
      config.infrastructure.size = 'large';
      config.features.push('postgresql');
    }

    if (analysis.hasTests) {
      config.features.push('testing');
    }

    if (analysis.dockerized) {
      config.features.push('docker');
      config.build.command = 'docker build -t app .';
      config.runtime.command = 'docker run -p 3000:3000 app';
    }

    return config;
  }

  /**
   * Get recent commits for a repository
   */
  async getCommits(owner, repo, options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.sha) params.append('sha', options.sha);
      if (options.path) params.append('path', options.path);
      if (options.since) params.append('since', options.since);
      if (options.until) params.append('until', options.until);
      if (options.per_page) params.append('per_page', options.per_page.toString());
      if (options.page) params.append('page', options.page.toString());

      const endpoint = `/repos/${owner}/${repo}/commits${params.toString() ? '?' + params.toString() : ''}`;
      const commits = await this.makeRequest(endpoint);

      return commits.map(commit => ({
        sha: commit.sha,
        message: commit.commit.message,
        author: {
          name: commit.commit.author.name,
          email: commit.commit.author.email,
          date: commit.commit.author.date
        },
        committer: {
          name: commit.commit.committer.name,
          email: commit.commit.committer.email,
          date: commit.commit.committer.date
        },
        url: commit.html_url,
        stats: commit.stats
      }));
    } catch (error) {
      this.logger.error('Failed to get commits:', { owner, repo, error: error.message });
      throw error;
    }
  }

  /**
   * Get branches for a repository
   */
  async getBranches(owner, repo) {
    try {
      const branches = await this.makeRequest(`/repos/${owner}/${repo}/branches`);
      
      return branches.map(branch => ({
        name: branch.name,
        sha: branch.commit.sha,
        protected: branch.protected
      }));
    } catch (error) {
      this.logger.error('Failed to get branches:', { owner, repo, error: error.message });
      throw error;
    }
  }

  /**
   * Create a webhook for the repository
   */
  async createWebhook(owner, repo, webhookUrl, secret) {
    try {
      const webhook = await this.makeRequest(`/repos/${owner}/${repo}/hooks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'web',
          active: true,
          events: ['push', 'pull_request'],
          config: {
            url: webhookUrl,
            content_type: 'json',
            secret: secret,
            insecure_ssl: '0'
          }
        })
      });

      this.logger.info('Webhook created successfully:', {
        owner,
        repo,
        webhookId: webhook.id,
        url: webhookUrl
      });

      return {
        id: webhook.id,
        url: webhook.config.url,
        events: webhook.events,
        active: webhook.active
      };
    } catch (error) {
      this.logger.error('Failed to create webhook:', { owner, repo, error: error.message });
      throw error;
    }
  }

  /**
   * List webhooks for a repository
   */
  async listWebhooks(owner, repo) {
    try {
      const webhooks = await this.makeRequest(`/repos/${owner}/${repo}/hooks`);
      
      return webhooks.map(webhook => ({
        id: webhook.id,
        name: webhook.name,
        active: webhook.active,
        events: webhook.events,
        url: webhook.config?.url,
        createdAt: webhook.created_at,
        updatedAt: webhook.updated_at
      }));
    } catch (error) {
      this.logger.error('Failed to list webhooks:', { owner, repo, error: error.message });
      throw error;
    }
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(owner, repo, webhookId) {
    try {
      await this.makeRequest(`/repos/${owner}/${repo}/hooks/${webhookId}`, {
        method: 'DELETE'
      });

      this.logger.info('Webhook deleted successfully:', { owner, repo, webhookId });
      return true;
    } catch (error) {
      this.logger.error('Failed to delete webhook:', { owner, repo, webhookId, error: error.message });
      throw error;
    }
  }
}

module.exports = { GitHubService };