/**
 * Natural Language Deployment Parser
 * Converts human language deployment requests into structured configurations
 * Makes deployment feel like talking to an AI DevOps engineer
 */

import { EventEmitter } from 'events';

class NLPDeploymentParser extends EventEmitter {
  constructor(options = {}) {
    super();
    this.logger = options.logger || console;
    this.aiProvider = options.aiProvider;
    
    // Initialize knowledge base
    this.stackPatterns = this.initializeStackPatterns();
    this.featurePatterns = this.initializeFeaturePatterns();
    this.databasePatterns = this.initializeDatabasePatterns();
    this.frameworkPatterns = this.initializeFrameworkPatterns();
    this.deploymentPatterns = this.initializeDeploymentPatterns();
    
    this.logger.info('NLP Deployment Parser initialized');
  }

  /**
   * Main parsing function - converts natural language to deployment config
   * @param {string} userInput - Natural language deployment request
   * @param {Object} context - Additional context (user preferences, history)
   * @returns {Object} Structured deployment configuration
   */
  async parseDeploymentRequest(userInput, context = {}) {
    try {
      this.logger.info('Parsing deployment request', { input: userInput });
      
      // Normalize input
      const normalizedInput = this.normalizeInput(userInput);
      
      // Extract deployment intent
      const intent = this.extractDeploymentIntent(normalizedInput);
      
      // Parse stack and technologies
      const stackInfo = this.parseStackInformation(normalizedInput);
      
      // Parse features and requirements
      const features = this.parseFeatures(normalizedInput);
      
      // Parse database requirements
      const database = this.parseDatabase(normalizedInput);
      
      // Parse deployment preferences
      const deploymentPrefs = this.parseDeploymentPreferences(normalizedInput);
      
      // Parse infrastructure requirements
      const infrastructure = this.parseInfrastructure(normalizedInput);
      
      // Use AI for complex parsing if available
      let aiEnhancement = null;
      if (this.aiProvider) {
        aiEnhancement = await this.enhanceWithAI(userInput, {
          intent,
          stackInfo,
          features,
          database,
          deploymentPrefs,
          infrastructure
        });
      }
      
      // Build structured configuration
      const config = this.buildDeploymentConfig({
        intent,
        stackInfo,
        features,
        database,
        deploymentPrefs,
        infrastructure,
        aiEnhancement,
        context
      });
      
      // Validate and enrich configuration
      const validatedConfig = this.validateAndEnrichConfig(config);
      
      this.emit('parsing:completed', {
        originalInput: userInput,
        parsedConfig: validatedConfig,
        confidence: this.calculateConfidence(validatedConfig)
      });
      
      return validatedConfig;
      
    } catch (error) {
      this.logger.error('Failed to parse deployment request', { 
        input: userInput, 
        error: error.message 
      });
      throw new NLPParsingError(`Failed to parse deployment request: ${error.message}`, userInput);
    }
  }

  /**
   * Normalize user input for better parsing
   */
  normalizeInput(input) {
    return input
      .toLowerCase()
      .trim()
      // Expand common abbreviations
      .replace(/\bdb\b/g, 'database')
      .replace(/\bauth\b/g, 'authentication')
      .replace(/\bapi\b/g, 'api')
      .replace(/\bui\b/g, 'user interface')
      .replace(/\bfrontend\b/g, 'frontend')
      .replace(/\bbackend\b/g, 'backend')
      // Normalize stack names
      .replace(/\bmern\b/g, 'mongodb express react nodejs')
      .replace(/\bmean\b/g, 'mongodb express angular nodejs')
      .replace(/\blamb\b/g, 'linux apache mysql php')
      .replace(/\blemp\b/g, 'linux nginx mysql php')
      .replace(/\bjamstack\b/g, 'javascript api markup');
  }

  /**
   * Extract deployment intent from user input
   */
  extractDeploymentIntent(input) {
    const intentPatterns = {
      deploy: /\b(deploy|launch|start|create|build|setup|make)\b/,
      update: /\b(update|upgrade|modify|change|edit)\b/,
      scale: /\b(scale|resize|expand|grow|increase)\b/,
      migrate: /\b(migrate|move|transfer|switch)\b/,
      clone: /\b(clone|copy|duplicate|replicate)\b/
    };
    
    for (const [intent, pattern] of Object.entries(intentPatterns)) {
      if (pattern.test(input)) {
        return intent;
      }
    }
    
    return 'deploy'; // Default intent
  }

  /**
   * Parse stack and technology information
   */
  parseStackInformation(input) {
    const detectedTechnologies = {
      frontend: [],
      backend: [],
      database: [],
      stack: null,
      language: null
    };
    
    // Check for full stack patterns
    for (const [stackName, pattern] of Object.entries(this.stackPatterns)) {
      if (pattern.test(input)) {
        detectedTechnologies.stack = stackName;
        detectedTechnologies.frontend = this.getStackComponents(stackName, 'frontend');
        detectedTechnologies.backend = this.getStackComponents(stackName, 'backend');
        detectedTechnologies.database = this.getStackComponents(stackName, 'database');
        break;
      }
    }
    
    // Check for individual frameworks if no stack detected
    if (!detectedTechnologies.stack) {
      for (const [framework, info] of Object.entries(this.frameworkPatterns)) {
        if (info.pattern.test(input)) {
          detectedTechnologies[info.type].push(framework);
          if (info.language) {
            detectedTechnologies.language = info.language;
          }
        }
      }
    }
    
    return detectedTechnologies;
  }

  /**
   * Parse features and requirements
   */
  parseFeatures(input) {
    const features = [];
    
    for (const [feature, pattern] of Object.entries(this.featurePatterns)) {
      if (pattern.test(input)) {
        features.push(feature);
      }
    }
    
    return features;
  }

  /**
   * Parse database requirements
   */
  parseDatabase(input) {
    for (const [dbName, pattern] of Object.entries(this.databasePatterns)) {
      if (pattern.test(input)) {
        return {
          type: dbName,
          required: true,
          features: this.extractDatabaseFeatures(input, dbName)
        };
      }
    }
    
    // Check if database is mentioned generically
    if (/\b(database|db|storage|persist)\b/.test(input)) {
      return {
        type: 'auto', // Let the system choose
        required: true,
        features: this.extractDatabaseFeatures(input)
      };
    }
    
    return null;
  }

  /**
   * Parse deployment preferences
   */
  parseDeploymentPreferences(input) {
    const preferences = {
      environment: 'production',
      region: null,
      scaling: 'auto',
      ssl: true,
      cdn: false
    };
    
    // Environment
    if (/\b(dev|development|staging|test)\b/.test(input)) {
      preferences.environment = 'development';
    } else if (/\b(prod|production|live)\b/.test(input)) {
      preferences.environment = 'production';
    }
    
    // Region preferences
    const regionMatch = input.match(/\b(us|europe|asia|global)\b/);
    if (regionMatch) {
      preferences.region = regionMatch[1];
    }
    
    // Scaling preferences
    if (/\b(no.?scale|fixed|static)\b/.test(input)) {
      preferences.scaling = 'fixed';
    } else if (/\b(auto.?scale|dynamic|elastic)\b/.test(input)) {
      preferences.scaling = 'auto';
    }
    
    // SSL/Security
    if (/\b(no.?ssl|http.only)\b/.test(input)) {
      preferences.ssl = false;
    }
    
    // CDN
    if (/\b(cdn|fast|global|cache)\b/.test(input)) {
      preferences.cdn = true;
    }
    
    return preferences;
  }

  /**
   * Parse infrastructure requirements
   */
  parseInfrastructure(input) {
    const infrastructure = {
      size: 'medium',
      instances: 1,
      memory: null,
      cpu: null,
      storage: null
    };
    
    // Size indicators
    if (/\b(small|tiny|minimal|basic)\b/.test(input)) {
      infrastructure.size = 'small';
    } else if (/\b(large|big|heavy|enterprise)\b/.test(input)) {
      infrastructure.size = 'large';
    } else if (/\b(huge|massive|enterprise.grade)\b/.test(input)) {
      infrastructure.size = 'xlarge';
    }
    
    // Specific resource requirements
    const memoryMatch = input.match(/(\d+)\s*(gb|mb|gib|mib)?\s*(memory|ram)/);
    if (memoryMatch) {
      infrastructure.memory = this.parseMemorySize(memoryMatch[1], memoryMatch[2]);
    }
    
    const cpuMatch = input.match(/(\d+)\s*(cpu|core|vcpu)/);
    if (cpuMatch) {
      infrastructure.cpu = parseInt(cpuMatch[1]);
    }
    
    const storageMatch = input.match(/(\d+)\s*(gb|tb|gib|tib)?\s*(storage|disk|space)/);
    if (storageMatch) {
      infrastructure.storage = this.parseStorageSize(storageMatch[1], storageMatch[2]);
    }
    
    return infrastructure;
  }
  /**
   * Enhance parsing with AI for complex requests
   */
  async enhanceWithAI(userInput, parsedData) {
    if (!this.aiProvider) return null;
    
    try {
      const prompt = this.buildAIEnhancementPrompt(userInput, parsedData);
      
      const aiResponse = await this.aiProvider.analyze({
        prompt,
        temperature: 0.3, // Lower temperature for more consistent parsing
        maxTokens: 800
      });
      
      return this.parseAIResponse(aiResponse);
      
    } catch (error) {
      this.logger.warn('AI enhancement failed', { error: error.message });
      return null;
    }
  }

  /**
   * Build deployment configuration from parsed components
   */
  buildDeploymentConfig(components) {
    const {
      intent,
      stackInfo,
      features,
      database,
      deploymentPrefs,
      infrastructure,
      aiEnhancement,
      context
    } = components;
    
    const config = {
      // Basic deployment info
      intent,
      name: this.generateAppName(stackInfo, context),
      
      // Technology stack
      stack: stackInfo.stack || this.inferStack(stackInfo),
      frontend: stackInfo.frontend,
      backend: stackInfo.backend,
      language: stackInfo.language || this.inferLanguage(stackInfo),
      
      // Features and capabilities
      features: features || [],
      
      // Database configuration
      database: database || this.inferDatabase(stackInfo, features),
      
      // Infrastructure requirements
      infrastructure: {
        size: infrastructure.size,
        instances: infrastructure.instances,
        memory: infrastructure.memory || this.getDefaultMemory(infrastructure.size),
        cpu: infrastructure.cpu || this.getDefaultCPU(infrastructure.size),
        storage: infrastructure.storage || this.getDefaultStorage(infrastructure.size),
        scaling: {
          enabled: deploymentPrefs.scaling === 'auto',
          minInstances: 1,
          maxInstances: this.getMaxInstances(infrastructure.size)
        }
      },
      
      // Deployment preferences
      environment: deploymentPrefs.environment,
      region: deploymentPrefs.region || this.getDefaultRegion(),
      ssl: deploymentPrefs.ssl,
      cdn: deploymentPrefs.cdn,
      
      // Build configuration
      build: this.generateBuildConfig(stackInfo, features),
      
      // Runtime configuration
      runtime: this.generateRuntimeConfig(stackInfo, features, database),
      
      // Networking configuration
      networking: this.generateNetworkingConfig(deploymentPrefs, features),
      
      // AI enhancements
      aiSuggestions: aiEnhancement,
      
      // Metadata
      metadata: {
        parsedAt: new Date().toISOString(),
        originalInput: components.originalInput,
        confidence: this.calculateConfidence(components),
        source: 'nlp_parser'
      }
    };
    
    return config;
  }

  /**
   * Validate and enrich the configuration
   */
  validateAndEnrichConfig(config) {
    // Ensure required fields
    if (!config.name) {
      config.name = `app-${Date.now()}`;
    }
    
    // Validate stack compatibility
    if (config.database && config.stack) {
      this.validateStackDatabaseCompatibility(config.stack, config.database.type);
    }
    
    // Add missing features based on stack
    config.features = this.enrichFeatures(config.features, config.stack, config.database);
    
    // Optimize infrastructure based on stack
    config.infrastructure = this.optimizeInfrastructure(config.infrastructure, config.stack);
    
    // Add security defaults
    config.security = this.generateSecurityConfig(config.features);
    
    // Add monitoring configuration
    config.monitoring = this.generateMonitoringConfig(config.stack, config.features);
    
    return config;
  }

  /**
   * Initialize pattern matching rules
   */
  initializeStackPatterns() {
    return {
      'MERN': /\b(mern|mongodb.*express.*react.*node)\b/,
      'MEAN': /\b(mean|mongodb.*express.*angular.*node)\b/,
      'LAMP': /\b(lamp|linux.*apache.*mysql.*php)\b/,
      'LEMP': /\b(lemp|linux.*nginx.*mysql.*php)\b/,
      'JAMStack': /\b(jamstack|javascript.*api.*markup|static.*site)\b/,
      'Django': /\b(django|python.*web)\b/,
      'Rails': /\b(rails|ruby.*on.*rails)\b/,
      'Spring': /\b(spring|java.*web|spring.*boot)\b/,
      'ASP.NET': /\b(asp\.net|dotnet|c#.*web)\b/,
      'NextJS': /\b(next\.js|nextjs|react.*ssr)\b/,
      'NuxtJS': /\b(nuxt\.js|nuxtjs|vue.*ssr)\b/,
      'Serverless': /\b(serverless|lambda|functions|faas)\b/
    };
  }

  initializeFeaturePatterns() {
    return {
      'authentication': /\b(auth|authentication|login|signup|user.*management)\b/,
      'authorization': /\b(authorization|permissions|roles|rbac)\b/,
      'api': /\b(api|rest|graphql|endpoints)\b/,
      'realtime': /\b(realtime|websocket|live|chat|notifications)\b/,
      'file_upload': /\b(upload|file.*upload|media|images)\b/,
      'search': /\b(search|elasticsearch|full.*text)\b/,
      'analytics': /\b(analytics|tracking|metrics|stats)\b/,
      'payment': /\b(payment|stripe|paypal|billing|checkout)\b/,
      'email': /\b(email|mail|smtp|notifications)\b/,
      'caching': /\b(cache|caching|redis|memcached)\b/,
      'queue': /\b(queue|jobs|background.*tasks|worker)\b/,
      'admin': /\b(admin|dashboard|cms|content.*management)\b/,
      'mobile_api': /\b(mobile|ios|android|app.*api)\b/,
      'social_login': /\b(social.*login|oauth|google.*login|facebook.*login)\b/,
      'multi_tenant': /\b(multi.*tenant|saas|tenant)\b/,
      'internationalization': /\b(i18n|internationalization|multi.*language)\b/
    };
  }

  initializeDatabasePatterns() {
    return {
      'mongodb': /\b(mongodb|mongo|nosql|document)\b/,
      'postgresql': /\b(postgresql|postgres|psql)\b/,
      'mysql': /\b(mysql|mariadb)\b/,
      'redis': /\b(redis|cache|session.*store)\b/,
      'elasticsearch': /\b(elasticsearch|elastic|search.*engine)\b/,
      'sqlite': /\b(sqlite|embedded.*db)\b/,
      'dynamodb': /\b(dynamodb|aws.*db)\b/,
      'firestore': /\b(firestore|firebase.*db)\b/,
      'supabase': /\b(supabase|postgres.*service)\b/,
      'planetscale': /\b(planetscale|mysql.*service)\b/
    };
  }

  initializeFrameworkPatterns() {
    return {
      'react': { pattern: /\breact\b/, type: 'frontend', language: 'javascript' },
      'vue': { pattern: /\bvue\b/, type: 'frontend', language: 'javascript' },
      'angular': { pattern: /\bangular\b/, type: 'frontend', language: 'typescript' },
      'svelte': { pattern: /\bsvelte\b/, type: 'frontend', language: 'javascript' },
      'express': { pattern: /\bexpress\b/, type: 'backend', language: 'javascript' },
      'fastify': { pattern: /\bfastify\b/, type: 'backend', language: 'javascript' },
      'koa': { pattern: /\bkoa\b/, type: 'backend', language: 'javascript' },
      'django': { pattern: /\bdjango\b/, type: 'backend', language: 'python' },
      'flask': { pattern: /\bflask\b/, type: 'backend', language: 'python' },
      'fastapi': { pattern: /\bfastapi\b/, type: 'backend', language: 'python' },
      'rails': { pattern: /\brails\b/, type: 'backend', language: 'ruby' },
      'spring': { pattern: /\bspring\b/, type: 'backend', language: 'java' },
      'laravel': { pattern: /\blaravel\b/, type: 'backend', language: 'php' },
      'gin': { pattern: /\bgin\b/, type: 'backend', language: 'go' },
      'fiber': { pattern: /\bfiber\b/, type: 'backend', language: 'go' }
    };
  }

  initializeDeploymentPatterns() {
    return {
      'container': /\b(docker|container|kubernetes|k8s)\b/,
      'serverless': /\b(serverless|lambda|functions|vercel|netlify)\b/,
      'static': /\b(static|cdn|jamstack|github.*pages)\b/,
      'traditional': /\b(server|vps|dedicated|traditional)\b/
    };
  }

  // Helper methods for configuration generation
  generateAppName(stackInfo, context) {
    if (context.suggestedName) return context.suggestedName;
    
    const stack = stackInfo.stack || 'app';
    const timestamp = Date.now().toString().slice(-4);
    return `${stack.toLowerCase()}-app-${timestamp}`;
  }

  inferStack(stackInfo) {
    if (stackInfo.frontend.includes('react') && stackInfo.backend.includes('express')) {
      return 'MERN';
    }
    if (stackInfo.frontend.includes('angular') && stackInfo.backend.includes('express')) {
      return 'MEAN';
    }
    if (stackInfo.backend.includes('django')) {
      return 'Django';
    }
    if (stackInfo.backend.includes('rails')) {
      return 'Rails';
    }
    return 'Custom';
  }

  inferLanguage(stackInfo) {
    if (stackInfo.frontend.includes('react') || stackInfo.backend.includes('express')) {
      return 'javascript';
    }
    if (stackInfo.frontend.includes('angular')) {
      return 'typescript';
    }
    if (stackInfo.backend.includes('django') || stackInfo.backend.includes('flask')) {
      return 'python';
    }
    return 'javascript'; // Default
  }

  inferDatabase(stackInfo, features) {
    if (stackInfo.stack === 'MERN' || stackInfo.stack === 'MEAN') {
      return { type: 'mongodb', required: true };
    }
    if (stackInfo.stack === 'LAMP' || stackInfo.stack === 'LEMP') {
      return { type: 'mysql', required: true };
    }
    if (features.includes('authentication') || features.includes('api')) {
      return { type: 'postgresql', required: true };
    }
    return null;
  }

  generateBuildConfig(stackInfo, features) {
    const config = {
      command: 'npm run build',
      outputDirectory: 'dist',
      environment: {},
      nodeVersion: '18'
    };
    
    if (stackInfo.language === 'python') {
      config.command = 'pip install -r requirements.txt';
      config.pythonVersion = '3.9';
    } else if (stackInfo.language === 'java') {
      config.command = 'mvn clean package';
      config.javaVersion = '11';
    }
    
    return config;
  }

  generateRuntimeConfig(stackInfo, features, database) {
    const config = {
      command: 'npm start',
      port: 3000,
      healthCheck: '/health',
      environment: {
        NODE_ENV: 'production'
      }
    };
    
    if (database) {
      config.environment.DATABASE_URL = `${database.type}://localhost:5432/app`;
    }
    
    if (features.includes('authentication')) {
      config.environment.JWT_SECRET = 'auto-generated';
    }
    
    return config;
  }

  generateNetworkingConfig(deploymentPrefs, features) {
    return {
      domains: [],
      ssl: deploymentPrefs.ssl,
      cdn: deploymentPrefs.cdn || features.includes('static'),
      cors: features.includes('api')
    };
  }

  generateSecurityConfig(features) {
    const security = {
      https: true,
      headers: true,
      csrf: features.includes('authentication'),
      rateLimit: features.includes('api')
    };
    
    return security;
  }

  generateMonitoringConfig(stack, features) {
    return {
      enabled: true,
      healthCheck: {
        path: '/health',
        interval: 30,
        timeout: 10
      },
      logging: {
        level: 'info',
        format: 'json'
      },
      metrics: features.includes('analytics')
    };
  }

  // Resource calculation helpers
  getDefaultMemory(size) {
    const memoryMap = {
      'small': 512,
      'medium': 1024,
      'large': 2048,
      'xlarge': 4096
    };
    return memoryMap[size] || 1024;
  }

  getDefaultCPU(size) {
    const cpuMap = {
      'small': 0.5,
      'medium': 1,
      'large': 2,
      'xlarge': 4
    };
    return cpuMap[size] || 1;
  }

  getDefaultStorage(size) {
    const storageMap = {
      'small': 10,
      'medium': 20,
      'large': 50,
      'xlarge': 100
    };
    return storageMap[size] || 20;
  }

  getMaxInstances(size) {
    const instanceMap = {
      'small': 3,
      'medium': 5,
      'large': 10,
      'xlarge': 20
    };
    return instanceMap[size] || 5;
  }

  getDefaultRegion() {
    return 'us-east-1';
  }

  // Utility methods
  parseMemorySize(value, unit) {
    const size = parseInt(value);
    if (!unit || unit.toLowerCase().includes('mb')) return size;
    if (unit.toLowerCase().includes('gb')) return size * 1024;
    return size;
  }

  parseStorageSize(value, unit) {
    const size = parseInt(value);
    if (!unit || unit.toLowerCase().includes('gb')) return size;
    if (unit.toLowerCase().includes('tb')) return size * 1024;
    return size;
  }

  getStackComponents(stackName, type) {
    const stackComponents = {
      'MERN': {
        frontend: ['react'],
        backend: ['express', 'nodejs'],
        database: ['mongodb']
      },
      'MEAN': {
        frontend: ['angular'],
        backend: ['express', 'nodejs'],
        database: ['mongodb']
      },
      'LAMP': {
        frontend: ['html', 'css', 'javascript'],
        backend: ['php', 'apache'],
        database: ['mysql']
      },
      'Django': {
        frontend: ['html', 'css', 'javascript'],
        backend: ['django', 'python'],
        database: ['postgresql']
      }
    };
    
    return stackComponents[stackName]?.[type] || [];
  }

  extractDatabaseFeatures(input, dbType = null) {
    const features = [];
    
    if (/\b(backup|snapshot)\b/.test(input)) features.push('backup');
    if (/\b(replica|replication)\b/.test(input)) features.push('replication');
    if (/\b(cluster|sharding)\b/.test(input)) features.push('clustering');
    if (/\b(ssl|encrypt)\b/.test(input)) features.push('encryption');
    
    return features;
  }

  enrichFeatures(features, stack, database) {
    const enriched = [...features];
    
    // Add implied features based on stack
    if (stack === 'MERN' || stack === 'MEAN') {
      if (!enriched.includes('api')) enriched.push('api');
    }
    
    // Add features based on database
    if (database && !enriched.includes('api')) {
      enriched.push('api');
    }
    
    return enriched;
  }

  optimizeInfrastructure(infrastructure, stack) {
    const optimized = { ...infrastructure };
    
    // Adjust resources based on stack
    if (stack === 'JAMStack') {
      optimized.memory = Math.min(optimized.memory, 512);
      optimized.cpu = Math.min(optimized.cpu, 0.5);
    } else if (stack === 'Django' || stack === 'Rails') {
      optimized.memory = Math.max(optimized.memory, 1024);
    }
    
    return optimized;
  }

  validateStackDatabaseCompatibility(stack, dbType) {
    const incompatible = {
      'MERN': ['mysql', 'postgresql'],
      'MEAN': ['mysql', 'postgresql'],
      'LAMP': ['mongodb'],
      'LEMP': ['mongodb']
    };
    
    if (incompatible[stack]?.includes(dbType)) {
      this.logger.warn('Potential stack-database incompatibility', { stack, dbType });
    }
  }

  calculateConfidence(components) {
    let confidence = 0.5; // Base confidence
    
    if (components.stackInfo.stack) confidence += 0.2;
    if (components.features.length > 0) confidence += 0.1;
    if (components.database) confidence += 0.1;
    if (components.aiEnhancement) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  buildAIEnhancementPrompt(userInput, parsedData) {
    return `
      Analyze this deployment request and enhance the parsing:
      
      User Input: "${userInput}"
      
      Current Parsing:
      - Stack: ${parsedData.stackInfo.stack || 'Unknown'}
      - Features: ${parsedData.features.join(', ') || 'None detected'}
      - Database: ${parsedData.database?.type || 'None'}
      
      Please provide:
      1. Missing technologies or frameworks
      2. Implied features not explicitly mentioned
      3. Recommended infrastructure optimizations
      4. Potential security considerations
      
      Respond in JSON format:
      {
        "missingTechnologies": [],
        "impliedFeatures": [],
        "infrastructureRecommendations": {},
        "securityConsiderations": []
      }
    `;
  }

  parseAIResponse(response) {
    try {
      return JSON.parse(response);
    } catch (error) {
      this.logger.warn('Failed to parse AI response', { error: error.message });
      return null;
    }
  }
}

class NLPParsingError extends Error {
  constructor(message, originalInput) {
    super(message);
    this.name = 'NLPParsingError';
    this.originalInput = originalInput;
  }
}

export { NLPDeploymentParser, NLPParsingError };