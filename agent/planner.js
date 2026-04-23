/**
 * Planner Agent - Analyzes repositories and determines infrastructure requirements
 * Handles stack detection, dependency analysis, and infrastructure planning
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const axios = require('axios');

class PlannerAgent {
  constructor(options = {}) {
    this.aiProvider = options.aiProvider || 'openai';
    this.apiKeys = options.apiKeys || {};
    this.logger = options.logger || console;
    this.cache = new Map();
    this.supportedStacks = {
      'package.json': 'nodejs',
      'requirements.txt': 'python',
      'Gemfile': 'ruby',
      'go.mod': 'golang',
      'Cargo.toml': 'rust',
      'composer.json': 'php',
      'pom.xml': 'java',
      'Dockerfile': 'docker'
    };
  }

  /**
   * Main planning method - analyzes repo and generates deployment plan
   * @param {Object} input - Repository URL or user prompt
   * @returns {Object} Deployment plan with infrastructure requirements
   */
  async plan(input) {
    try {
      this.logger.info('Starting deployment planning', { input });
      
      const analysisId = this.generateAnalysisId();
      const startTime = Date.now();

      // Step 1: Extract repository information
      const repoInfo = await this.extractRepoInfo(input);
      
      // Step 2: Clone and analyze repository
      const codeAnalysis = await this.analyzeRepository(repoInfo);
      
      // Step 3: Detect technology stack
      const stackInfo = await this.detectStack(codeAnalysis);
      
      // Step 4: Analyze dependencies
      const dependencies = await this.analyzeDependencies(stackInfo, codeAnalysis);
      
      // Step 5: Generate infrastructure requirements
      const infraRequirements = await this.generateInfraRequirements(stackInfo, dependencies);
      
      // Step 6: AI-powered optimization
      const optimizedPlan = await this.optimizeWithAI(infraRequirements, codeAnalysis);
      
      const plan = {
        id: analysisId,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        repository: repoInfo,
        stack: stackInfo,
        dependencies,
        infrastructure: optimizedPlan,
        buildConfig: this.generateBuildConfig(stackInfo, dependencies),
        deploymentStrategy: this.selectDeploymentStrategy(optimizedPlan),
        estimatedCost: this.estimateCost(optimizedPlan),
        confidence: this.calculateConfidence(stackInfo, dependencies)
      };

      this.logger.info('Planning completed successfully', { 
        analysisId, 
        duration: plan.duration,
        stack: stackInfo.primary 
      });

      return plan;

    } catch (error) {
      this.logger.error('Planning failed', { error: error.message, stack: error.stack });
      throw new PlannerError(`Planning failed: ${error.message}`, error);
    }
  }

  /**
   * Extract repository information from input
   */
  async extractRepoInfo(input) {
    if (typeof input === 'string' && input.includes('github.com')) {
      return this.parseGitHubUrl(input);
    } else if (input.repoUrl) {
      return this.parseGitHubUrl(input.repoUrl);
    } else if (input.prompt) {
      return await this.extractRepoFromPrompt(input.prompt);
    } else {
      throw new Error('Invalid input: must provide repository URL or prompt');
    }
  }

  /**
   * Parse GitHub URL to extract repository information
   */
  parseGitHubUrl(url) {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      throw new Error('Invalid GitHub URL format');
    }

    return {
      platform: 'github',
      owner: match[1],
      repo: match[2].replace('.git', ''),
      url: url,
      branch: 'main' // Default branch
    };
  }

  /**
   * Extract repository URL from natural language prompt using AI
   */
  async extractRepoFromPrompt(prompt) {
    const aiResponse = await this.callAI({
      prompt: `Extract repository information from this prompt: "${prompt}"
      
      If a GitHub URL is mentioned, extract it.
      If no URL is provided, respond with "NO_REPO_FOUND".
      
      Format response as JSON:
      {
        "found": true/false,
        "url": "github_url_if_found",
        "confidence": 0.0-1.0
      }`,
      maxTokens: 200
    });

    const result = JSON.parse(aiResponse);
    if (!result.found) {
      throw new Error('No repository URL found in prompt');
    }

    return this.parseGitHubUrl(result.url);
  }

  /**
   * Clone and analyze repository structure
   */
  async analyzeRepository(repoInfo) {
    const tempDir = `/tmp/repo-analysis-${Date.now()}`;
    
    try {
      // Clone repository
      execSync(`git clone --depth 1 ${repoInfo.url} ${tempDir}`, { 
        stdio: 'pipe',
        timeout: 30000 
      });

      // Analyze file structure
      const fileStructure = await this.analyzeFileStructure(tempDir);
      const packageFiles = await this.findPackageFiles(tempDir);
      const configFiles = await this.findConfigFiles(tempDir);
      
      return {
        tempDir,
        fileStructure,
        packageFiles,
        configFiles,
        totalFiles: fileStructure.length,
        codeFiles: fileStructure.filter(f => this.isCodeFile(f)).length
      };

    } catch (error) {
      // Cleanup on error
      try {
        execSync(`rm -rf ${tempDir}`, { stdio: 'pipe' });
      } catch (cleanupError) {
        this.logger.warn('Failed to cleanup temp directory', { tempDir, error: cleanupError.message });
      }
      throw error;
    }
  }

  /**
   * Analyze file structure recursively
   */
  async analyzeFileStructure(dir, relativePath = '') {
    const files = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.env.example') continue;
      
      const fullPath = path.join(dir, entry.name);
      const relPath = path.join(relativePath, entry.name);

      if (entry.isDirectory()) {
        if (!this.shouldSkipDirectory(entry.name)) {
          const subFiles = await this.analyzeFileStructure(fullPath, relPath);
          files.push(...subFiles);
        }
      } else {
        const stats = await fs.stat(fullPath);
        files.push({
          path: relPath,
          size: stats.size,
          extension: path.extname(entry.name),
          isCode: this.isCodeFile(entry.name)
        });
      }
    }

    return files;
  }

  /**
   * Detect technology stack from repository analysis
   */
  async detectStack(codeAnalysis) {
    const stackScores = {};
    const detectedStacks = [];

    // Analyze package files
    for (const [file, stack] of Object.entries(this.supportedStacks)) {
      const found = codeAnalysis.packageFiles.find(f => f.includes(file));
      if (found) {
        stackScores[stack] = (stackScores[stack] || 0) + 10;
        detectedStacks.push({ stack, confidence: 0.9, evidence: file });
      }
    }

    // Analyze file extensions
    const extensionMap = {
      '.js': 'nodejs',
      '.ts': 'nodejs',
      '.py': 'python',
      '.rb': 'ruby',
      '.go': 'golang',
      '.rs': 'rust',
      '.php': 'php',
      '.java': 'java'
    };

    for (const file of codeAnalysis.fileStructure) {
      if (file.isCode && extensionMap[file.extension]) {
        const stack = extensionMap[file.extension];
        stackScores[stack] = (stackScores[stack] || 0) + 1;
      }
    }

    // Determine primary stack
    const primaryStack = Object.entries(stackScores)
      .sort(([,a], [,b]) => b - a)[0];

    if (!primaryStack) {
      throw new Error('Unable to detect technology stack');
    }

    return {
      primary: primaryStack[0],
      confidence: Math.min(primaryStack[1] / 10, 1.0),
      detected: detectedStacks,
      scores: stackScores
    };
  }

  /**
   * Analyze dependencies and requirements
   */
  async analyzeDependencies(stackInfo, codeAnalysis) {
    const dependencies = {
      runtime: [],
      build: [],
      database: [],
      services: []
    };

    try {
      switch (stackInfo.primary) {
        case 'nodejs':
          await this.analyzeNodeDependencies(dependencies, codeAnalysis.tempDir);
          break;
        case 'python':
          await this.analyzePythonDependencies(dependencies, codeAnalysis.tempDir);
          break;
        case 'ruby':
          await this.analyzeRubyDependencies(dependencies, codeAnalysis.tempDir);
          break;
        default:
          this.logger.warn('Dependency analysis not implemented for stack', { stack: stackInfo.primary });
      }

      // Detect database requirements
      dependencies.database = this.detectDatabaseRequirements(dependencies.runtime);
      
      // Detect service requirements
      dependencies.services = this.detectServiceRequirements(dependencies.runtime);

    } catch (error) {
      this.logger.warn('Dependency analysis failed', { error: error.message });
    }

    return dependencies;
  }

  /**
   * Analyze Node.js dependencies
   */
  async analyzeNodeDependencies(dependencies, tempDir) {
    const packageJsonPath = path.join(tempDir, 'package.json');
    
    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
      
      dependencies.runtime = Object.keys(packageJson.dependencies || {});
      dependencies.build = Object.keys(packageJson.devDependencies || {});
      
      // Detect Node.js version requirement
      if (packageJson.engines && packageJson.engines.node) {
        dependencies.nodeVersion = packageJson.engines.node;
      }

      // Detect scripts
      dependencies.scripts = packageJson.scripts || {};

    } catch (error) {
      this.logger.warn('Failed to analyze package.json', { error: error.message });
    }
  }

  /**
   * Generate infrastructure requirements based on analysis
   */
  async generateInfraRequirements(stackInfo, dependencies) {
    const requirements = {
      compute: this.calculateComputeRequirements(stackInfo, dependencies),
      storage: this.calculateStorageRequirements(dependencies),
      network: this.calculateNetworkRequirements(dependencies),
      database: this.generateDatabaseConfig(dependencies.database),
      services: this.generateServiceConfig(dependencies.services),
      environment: this.generateEnvironmentConfig(stackInfo, dependencies)
    };

    return requirements;
  }

  /**
   * Calculate compute requirements
   */
  calculateComputeRequirements(stackInfo, dependencies) {
    let cpu = 0.5; // Default CPU cores
    let memory = 512; // Default memory in MB
    let instances = 1;

    // Adjust based on stack
    switch (stackInfo.primary) {
      case 'nodejs':
        cpu = 1;
        memory = 1024;
        break;
      case 'python':
        cpu = 1;
        memory = 1024;
        break;
      case 'java':
        cpu = 2;
        memory = 2048;
        break;
    }

    // Adjust based on dependencies
    if (dependencies.runtime.some(dep => dep.includes('express') || dep.includes('fastify'))) {
      memory += 256;
    }

    if (dependencies.database.length > 0) {
      memory += 512;
    }

    return {
      cpu,
      memory,
      instances,
      scaling: {
        min: 1,
        max: 10,
        targetCPU: 70
      }
    };
  }

  /**
   * Optimize plan using AI
   */
  async optimizeWithAI(infraRequirements, codeAnalysis) {
    try {
      const prompt = `Optimize this deployment plan:
      
      Infrastructure Requirements:
      ${JSON.stringify(infraRequirements, null, 2)}
      
      Code Analysis:
      - Total files: ${codeAnalysis.totalFiles}
      - Code files: ${codeAnalysis.codeFiles}
      
      Provide optimizations for:
      1. Resource allocation
      2. Cost efficiency
      3. Performance
      4. Scalability
      
      Return JSON with optimized configuration.`;

      const aiResponse = await this.callAI({ prompt, maxTokens: 1000 });
      const optimizations = JSON.parse(aiResponse);

      return {
        ...infraRequirements,
        ...optimizations,
        aiOptimized: true
      };

    } catch (error) {
      this.logger.warn('AI optimization failed, using default plan', { error: error.message });
      return infraRequirements;
    }
  }

  /**
   * Generate build configuration
   */
  generateBuildConfig(stackInfo, dependencies) {
    const config = {
      buildCommand: null,
      startCommand: null,
      port: 3000,
      healthCheck: '/health',
      environment: {}
    };

    switch (stackInfo.primary) {
      case 'nodejs':
        config.buildCommand = dependencies.scripts?.build ? 'npm run build' : 'npm install';
        config.startCommand = dependencies.scripts?.start || 'npm start';
        config.port = this.detectPort(dependencies) || 3000;
        break;
      case 'python':
        config.buildCommand = 'pip install -r requirements.txt';
        config.startCommand = 'python app.py';
        config.port = 8000;
        break;
    }

    return config;
  }

  /**
   * Call AI provider for analysis
   */
  async callAI({ prompt, maxTokens = 500 }) {
    if (!this.apiKeys.openai) {
      throw new Error('AI provider API key not configured');
    }

    try {
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.1
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKeys.openai}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      return response.data.choices[0].message.content;

    } catch (error) {
      throw new Error(`AI provider error: ${error.message}`);
    }
  }

  // Utility methods
  generateAnalysisId() {
    return `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  shouldSkipDirectory(name) {
    const skipDirs = ['node_modules', '.git', 'dist', 'build', '__pycache__', '.venv'];
    return skipDirs.includes(name);
  }

  isCodeFile(filename) {
    const codeExtensions = ['.js', '.ts', '.py', '.rb', '.go', '.rs', '.php', '.java', '.cpp', '.c'];
    return codeExtensions.includes(path.extname(filename));
  }

  async findPackageFiles(dir) {
    const packageFiles = [];
    const entries = await fs.readdir(dir);
    
    for (const entry of entries) {
      if (Object.keys(this.supportedStacks).includes(entry)) {
        packageFiles.push(entry);
      }
    }
    
    return packageFiles;
  }

  async findConfigFiles(dir) {
    const configFiles = [];
    const configPatterns = ['Dockerfile', '.env.example', 'docker-compose.yml', 'nginx.conf'];
    const entries = await fs.readdir(dir);
    
    for (const entry of entries) {
      if (configPatterns.some(pattern => entry.includes(pattern))) {
        configFiles.push(entry);
      }
    }
    
    return configFiles;
  }

  detectDatabaseRequirements(runtimeDeps) {
    const dbMap = {
      'mongoose': 'mongodb',
      'pg': 'postgresql',
      'mysql2': 'mysql',
      'redis': 'redis',
      'sqlite3': 'sqlite'
    };

    return runtimeDeps
      .filter(dep => dbMap[dep])
      .map(dep => dbMap[dep]);
  }

  detectServiceRequirements(runtimeDeps) {
    const serviceMap = {
      'bull': 'redis-queue',
      'nodemailer': 'email-service',
      'stripe': 'payment-service',
      'aws-sdk': 'aws-services'
    };

    return runtimeDeps
      .filter(dep => serviceMap[dep])
      .map(dep => serviceMap[dep]);
  }

  detectPort(dependencies) {
    // Try to detect port from common patterns
    if (dependencies.scripts?.start) {
      const portMatch = dependencies.scripts.start.match(/PORT[=\s]+(\d+)/);
      if (portMatch) return parseInt(portMatch[1]);
    }
    return null;
  }

  calculateStorageRequirements(dependencies) {
    return {
      size: '10GB',
      type: 'ssd',
      backup: true
    };
  }

  calculateNetworkRequirements(dependencies) {
    return {
      bandwidth: '1Gbps',
      cdn: dependencies.services.includes('static-files'),
      loadBalancer: true
    };
  }

  generateDatabaseConfig(databases) {
    return databases.map(db => ({
      type: db,
      size: 'small',
      backup: true,
      multiAZ: false
    }));
  }

  generateServiceConfig(services) {
    return services.map(service => ({
      type: service,
      config: {}
    }));
  }

  generateEnvironmentConfig(stackInfo, dependencies) {
    const env = {
      NODE_ENV: 'production'
    };

    if (stackInfo.primary === 'nodejs') {
      env.PORT = '3000';
    }

    return env;
  }

  selectDeploymentStrategy(infraRequirements) {
    if (infraRequirements.compute.instances > 1) {
      return 'rolling';
    }
    return 'blue-green';
  }

  estimateCost(infraRequirements) {
    let monthlyCost = 0;

    // Compute costs
    monthlyCost += infraRequirements.compute.cpu * 20; // $20 per CPU core
    monthlyCost += (infraRequirements.compute.memory / 1024) * 10; // $10 per GB RAM

    // Database costs
    monthlyCost += infraRequirements.database.length * 25; // $25 per database

    return {
      monthly: Math.round(monthlyCost),
      currency: 'USD',
      breakdown: {
        compute: infraRequirements.compute.cpu * 20,
        memory: (infraRequirements.compute.memory / 1024) * 10,
        database: infraRequirements.database.length * 25
      }
    };
  }

  calculateConfidence(stackInfo, dependencies) {
    let confidence = stackInfo.confidence;
    
    if (dependencies.runtime.length > 0) confidence += 0.1;
    if (dependencies.scripts && Object.keys(dependencies.scripts).length > 0) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  // Cleanup method
  async cleanup(codeAnalysis) {
    if (codeAnalysis.tempDir) {
      try {
        execSync(`rm -rf ${codeAnalysis.tempDir}`, { stdio: 'pipe' });
      } catch (error) {
        this.logger.warn('Failed to cleanup temp directory', { 
          tempDir: codeAnalysis.tempDir, 
          error: error.message 
        });
      }
    }
  }
}

class PlannerError extends Error {
  constructor(message, originalError) {
    super(message);
    this.name = 'PlannerError';
    this.originalError = originalError;
  }
}

module.exports = { PlannerAgent, PlannerError };