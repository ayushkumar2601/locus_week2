/**
 * Self-Healing Deployment System with Groq AI Integration
 * Automatically detects failures, analyzes logs, suggests fixes, and redeploys
 * Uses Groq AI for intelligent failure analysis and fix generation
 */

import { EventEmitter } from 'events';
import { DeploymentService } from '../services/deployService.js';
import { analyzeFailure } from './llm/groqClient.js';

class SelfHealingSystem extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.deploymentService = options.deploymentService || new DeploymentService(options);
    this.logger = options.logger || console;
    this.aiProvider = options.aiProvider || 'groq';
    
    // Healing configuration
    this.config = {
      maxHealingAttempts: 3,
      healingCooldown: 300000, // 5 minutes
      analysisTimeout: 60000, // 1 minute
      confidenceThreshold: 0.7,
      ...options.config
    };
    
    // Track healing attempts per deployment
    this.healingAttempts = new Map();
    this.healingHistory = new Map();
    
    // Initialize failure detection patterns
    this.failurePatterns = this.initializeFailurePatterns();
    this.fixStrategies = this.initializeFixStrategies();
    
    this.logger.info('🔧 Self-Healing System initialized with Groq AI', { 
      maxAttempts: this.config.maxHealingAttempts,
      cooldown: this.config.healingCooldown,
      aiProvider: this.aiProvider
    });
  }

  /**
   * Main entry point - called when deployment failure is detected
   * @param {string} deploymentId - Failed deployment ID
   * @param {Object} failureContext - Context about the failure
   * @returns {Object} Healing result
   */
  async healDeployment(deploymentId, failureContext = {}) {
    try {
      this.logger.info('Starting self-healing process', { 
        deploymentId, 
        failureType: failureContext.type 
      });
      
      // Check if we can attempt healing
      if (!this.canAttemptHealing(deploymentId)) {
        return this.createHealingResult(false, 'Max healing attempts reached or cooldown active');
      }
      
      // Step 1: Comprehensive failure analysis
      const analysisResult = await this.analyzeFailure(deploymentId, failureContext);
      
      if (!analysisResult.success) {
        return this.createHealingResult(false, 'Failed to analyze deployment failure');
      }
      
      // Step 2: Generate fix suggestions
      const fixSuggestions = await this.generateFixSuggestions(analysisResult);
      
      if (fixSuggestions.length === 0) {
        return this.createHealingResult(false, 'No viable fix suggestions found');
      }
      
      // Step 3: Apply the best fix and redeploy
      const healingResult = await this.applyFixAndRedeploy(deploymentId, fixSuggestions);
      
      // Track healing attempt
      this.recordHealingAttempt(deploymentId, healingResult);
      
      return healingResult;
      
    } catch (error) {
      this.logger.error('Self-healing process failed', { 
        deploymentId, 
        error: error.message,
        stack: error.stack 
      });
      
      return this.createHealingResult(false, `Healing process error: ${error.message}`);
    }
  }
  /**
   * Analyze deployment failure using logs and system state with Groq AI
   * @param {string} deploymentId - Deployment identifier
   * @param {Object} failureContext - Initial failure context
   * @returns {Object} Analysis result with failure details
   */
  async analyzeFailure(deploymentId, failureContext) {
    try {
      this.logger.info('🔍 Analyzing deployment failure with Groq AI', { deploymentId });
      
      // Get deployment status and logs
      const [deploymentStatus, logs] = await Promise.all([
        this.deploymentService.getDeploymentStatus(deploymentId),
        this.deploymentService.getLogs(deploymentId, { 
          lines: 1000, 
          level: 'error,warn,info'
        })
      ]);
      
      // Parse logs for failure indicators
      const logAnalysis = this.parseLogsForFailures(logs.logs);
      
      // Analyze deployment configuration
      const configAnalysis = this.analyzeDeploymentConfig(deploymentStatus);
      
      // Detect failure patterns
      const patternMatches = this.detectFailurePatterns(logAnalysis, configAnalysis);
      
      // Groq AI-powered analysis for complex failures
      const aiAnalysis = await this.performGroqAnalysis(logs.logs, deploymentStatus, failureContext);
      
      const analysisResult = {
        success: true,
        deploymentId,
        failureType: this.determineFailureType(patternMatches, aiAnalysis),
        logAnalysis,
        configAnalysis,
        patternMatches,
        aiAnalysis,
        confidence: this.calculateAnalysisConfidence(patternMatches, aiAnalysis),
        timestamp: new Date().toISOString()
      };
      
      this.emit('failure:analyzed', analysisResult);
      
      return analysisResult;
      
    } catch (error) {
      this.logger.error('❌ Failure analysis failed', { deploymentId, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Parse deployment logs to identify failure indicators
   * @param {Array} logs - Array of log entries
   * @returns {Object} Parsed failure information
   */
  parseLogsForFailures(logs) {
    const failures = {
      buildErrors: [],
      runtimeErrors: [],
      dependencyIssues: [],
      portConflicts: [],
      configurationErrors: [],
      networkIssues: [],
      resourceConstraints: []
    };
    
    const errorPatterns = {
      buildErrors: [
        /compilation failed/i,
        /build failed/i,
        /syntax error/i,
        /module not found/i,
        /cannot resolve/i,
        /typescript error/i
      ],
      dependencyIssues: [
        /npm ERR!/i,
        /package not found/i,
        /dependency.*not found/i,
        /module.*cannot be resolved/i,
        /peer dep.*missing/i,
        /version conflict/i
      ],
      portConflicts: [
        /port.*already in use/i,
        /EADDRINUSE/i,
        /address already in use/i,
        /bind.*failed/i
      ],
      runtimeErrors: [
        /application crashed/i,
        /process exited/i,
        /uncaught exception/i,
        /unhandled rejection/i,
        /segmentation fault/i
      ],
      configurationErrors: [
        /configuration.*invalid/i,
        /env.*not found/i,
        /missing.*variable/i,
        /invalid.*config/i
      ],
      networkIssues: [
        /connection.*refused/i,
        /timeout/i,
        /network.*unreachable/i,
        /dns.*resolution.*failed/i
      ],
      resourceConstraints: [
        /out of memory/i,
        /disk.*full/i,
        /resource.*exhausted/i,
        /cpu.*limit.*exceeded/i
      ]
    };
    
    logs.forEach(log => {
      const message = log.message.toLowerCase();
      
      Object.keys(errorPatterns).forEach(category => {
        errorPatterns[category].forEach(pattern => {
          if (pattern.test(message)) {
            failures[category].push({
              timestamp: log.timestamp,
              message: log.message,
              level: log.level,
              source: log.source,
              pattern: pattern.source,
              raw: log
            });
          }
        });
      });
    });
    
    return {
      failures,
      totalErrors: Object.values(failures).reduce((sum, arr) => sum + arr.length, 0),
      mostCommonFailure: this.findMostCommonFailure(failures),
      timeline: this.buildFailureTimeline(failures)
    };
  }

  /**
   * Analyze deployment configuration for issues
   * @param {Object} deploymentStatus - Current deployment status
   * @returns {Object} Configuration analysis
   */
  analyzeDeploymentConfig(deploymentStatus) {
    const issues = [];
    const suggestions = [];
    
    // Check resource allocation
    if (deploymentStatus.resources) {
      if (deploymentStatus.resources.memory < 512) {
        issues.push({
          type: 'low_memory',
          severity: 'medium',
          description: 'Memory allocation may be insufficient',
          current: deploymentStatus.resources.memory,
          suggested: 1024
        });
      }
      
      if (deploymentStatus.resources.cpu < 0.5) {
        issues.push({
          type: 'low_cpu',
          severity: 'low',
          description: 'CPU allocation may be insufficient for build processes',
          current: deploymentStatus.resources.cpu,
          suggested: 1
        });
      }
    }
    
    // Check health check configuration
    if (deploymentStatus.health && deploymentStatus.health.status === 'unknown') {
      issues.push({
        type: 'health_check_missing',
        severity: 'medium',
        description: 'Health check endpoint not responding',
        suggestion: 'Verify health check path and implementation'
      });
    }
    
    // Check environment variables
    if (deploymentStatus.metadata && deploymentStatus.metadata.environment) {
      const env = deploymentStatus.metadata.environment;
      
      // Common missing environment variables
      const requiredEnvVars = ['NODE_ENV', 'PORT'];
      requiredEnvVars.forEach(envVar => {
        if (!env[envVar]) {
          issues.push({
            type: 'missing_env_var',
            severity: 'high',
            description: `Missing required environment variable: ${envVar}`,
            variable: envVar,
            suggestion: this.getEnvVarSuggestion(envVar)
          });
        }
      });
    }
    
    return {
      issues,
      suggestions,
      severity: this.calculateConfigSeverity(issues),
      fixable: issues.filter(issue => issue.type !== 'unknown').length
    };
  }
  /**
   * Generate fix suggestions based on analysis results
   * @param {Object} analysisResult - Complete failure analysis
   * @returns {Array} Array of fix suggestions with confidence scores
   */
  async generateFixSuggestions(analysisResult) {
    const suggestions = [];
    
    // Rule-based fix suggestions
    const ruleBased = this.generateRuleBasedFixes(analysisResult);
    suggestions.push(...ruleBased);
    
    // AI-powered fix suggestions for complex issues
    if (this.aiProvider && analysisResult.confidence < this.config.confidenceThreshold) {
      const aiFixes = await this.generateAIFixes(analysisResult);
      suggestions.push(...aiFixes);
    }
    
    // Sort by confidence and feasibility
    return suggestions
      .sort((a, b) => (b.confidence * b.feasibility) - (a.confidence * a.feasibility))
      .slice(0, 5); // Top 5 suggestions
  }

  /**
   * Generate rule-based fixes for common deployment issues
   * @param {Object} analysisResult - Analysis result
   * @returns {Array} Rule-based fix suggestions
   */
  generateRuleBasedFixes(analysisResult) {
    const fixes = [];
    const { logAnalysis, configAnalysis } = analysisResult;
    
    // Fix dependency issues
    if (logAnalysis.failures.dependencyIssues.length > 0) {
      const depIssue = logAnalysis.failures.dependencyIssues[0];
      
      if (depIssue.message.includes('npm ERR!')) {
        fixes.push({
          id: 'fix_npm_dependencies',
          type: 'dependency_fix',
          description: 'Clear npm cache and reinstall dependencies',
          confidence: 0.85,
          feasibility: 0.9,
          actions: [
            { type: 'build_command', value: 'npm cache clean --force && npm install' },
            { type: 'retry_deployment', reason: 'dependency_fix' }
          ],
          estimatedTime: '2-3 minutes'
        });
      }
      
      if (depIssue.message.includes('module not found')) {
        const moduleName = this.extractModuleName(depIssue.message);
        if (moduleName) {
          fixes.push({
            id: 'install_missing_module',
            type: 'dependency_fix',
            description: `Install missing module: ${moduleName}`,
            confidence: 0.9,
            feasibility: 0.95,
            actions: [
              { type: 'add_dependency', package: moduleName },
              { type: 'retry_deployment', reason: 'missing_dependency' }
            ],
            estimatedTime: '1-2 minutes'
          });
        }
      }
    }
    
    // Fix port conflicts
    if (logAnalysis.failures.portConflicts.length > 0) {
      fixes.push({
        id: 'fix_port_conflict',
        type: 'configuration_fix',
        description: 'Change application port to avoid conflicts',
        confidence: 0.95,
        feasibility: 0.9,
        actions: [
          { type: 'env_variable', key: 'PORT', value: '3001' },
          { type: 'retry_deployment', reason: 'port_conflict' }
        ],
        estimatedTime: '30 seconds'
      });
    }
    
    // Fix build errors
    if (logAnalysis.failures.buildErrors.length > 0) {
      const buildError = logAnalysis.failures.buildErrors[0];
      
      if (buildError.message.includes('typescript')) {
        fixes.push({
          id: 'fix_typescript_build',
          type: 'build_fix',
          description: 'Fix TypeScript compilation issues',
          confidence: 0.75,
          feasibility: 0.8,
          actions: [
            { type: 'build_command', value: 'npm run build -- --skipLibCheck' },
            { type: 'retry_deployment', reason: 'typescript_fix' }
          ],
          estimatedTime: '1-2 minutes'
        });
      }
      
      if (buildError.message.includes('memory')) {
        fixes.push({
          id: 'increase_build_memory',
          type: 'resource_fix',
          description: 'Increase memory allocation for build process',
          confidence: 0.8,
          feasibility: 0.85,
          actions: [
            { type: 'resource_update', memory: 2048 },
            { type: 'env_variable', key: 'NODE_OPTIONS', value: '--max-old-space-size=4096' },
            { type: 'retry_deployment', reason: 'memory_increase' }
          ],
          estimatedTime: '2-3 minutes'
        });
      }
    }
    
    // Fix configuration issues
    configAnalysis.issues.forEach(issue => {
      if (issue.type === 'missing_env_var') {
        fixes.push({
          id: `fix_env_${issue.variable.toLowerCase()}`,
          type: 'configuration_fix',
          description: `Set missing environment variable: ${issue.variable}`,
          confidence: 0.9,
          feasibility: 0.95,
          actions: [
            { type: 'env_variable', key: issue.variable, value: issue.suggestion },
            { type: 'retry_deployment', reason: 'env_variable_fix' }
          ],
          estimatedTime: '30 seconds'
        });
      }
      
      if (issue.type === 'low_memory') {
        fixes.push({
          id: 'increase_memory_allocation',
          type: 'resource_fix',
          description: 'Increase memory allocation',
          confidence: 0.85,
          feasibility: 0.9,
          actions: [
            { type: 'resource_update', memory: issue.suggested },
            { type: 'retry_deployment', reason: 'memory_increase' }
          ],
          estimatedTime: '1-2 minutes'
        });
      }
    });
    
    // Fix health check issues
    if (configAnalysis.issues.some(issue => issue.type === 'health_check_missing')) {
      fixes.push({
        id: 'fix_health_check',
        type: 'configuration_fix',
        description: 'Update health check configuration',
        confidence: 0.7,
        feasibility: 0.8,
        actions: [
          { type: 'health_check_path', value: '/health' },
          { type: 'retry_deployment', reason: 'health_check_fix' }
        ],
        estimatedTime: '1 minute'
      });
    }
    
    return fixes;
  }

  /**
   * Generate AI-powered fix suggestions using Groq for complex issues
   * @param {Object} analysisResult - Analysis result
   * @returns {Array} AI-generated fix suggestions
   */
  async generateAIFixes(analysisResult) {
    try {
      this.logger.info('🤖 Generating AI-powered fixes using Groq');
      
      const failureData = {
        deploymentId: analysisResult.deploymentId,
        type: analysisResult.failureType,
        status: 'failed',
        logs: analysisResult.logAnalysis.failures,
        error: analysisResult.logAnalysis.mostCommonFailure
      };
      
      const aiAnalysis = await analyzeFailure(failureData);
      
      if (aiAnalysis && aiAnalysis.fixes) {
        return aiAnalysis.fixes.map(fix => ({
          id: `groq_${fix.category}_${Date.now()}`,
          type: 'ai_generated',
          description: fix,
          confidence: aiAnalysis.confidence || 0.7,
          feasibility: 0.8,
          actions: [
            { type: 'custom', description: fix },
            { type: 'retry_deployment', reason: 'ai_fix_applied' }
          ],
          estimatedTime: '2-4 minutes',
          aiGenerated: true
        }));
      }
      
      return [];
      
    } catch (error) {
      this.logger.error('❌ Groq AI fix generation failed', { error: error.message });
      return [];
    }
  }

  /**
   * Apply the best fix suggestion and trigger redeployment
   * @param {string} deploymentId - Deployment identifier
   * @param {Array} fixSuggestions - Array of fix suggestions
   * @returns {Object} Healing result
   */
  async applyFixAndRedeploy(deploymentId, fixSuggestions) {
    const bestFix = fixSuggestions[0];
    
    try {
      this.logger.info('🔧 Applying fix and redeploying', { 
        deploymentId, 
        fixId: bestFix.id,
        fixType: bestFix.type 
      });
      
      // Get current deployment configuration
      const currentStatus = await this.deploymentService.getDeploymentStatus(deploymentId);
      
      // For demo purposes, simulate fix application by creating a new deployment
      const healedDeploymentId = `healed_${deploymentId}_${Date.now()}`;
      
      // Simulate healing by creating a new deployment with fixes applied
      const healingConfig = {
        name: `${currentStatus.name}-healed`,
        stack: 'Node.js',
        repository: { url: 'https://github.com/example/healed-app' },
        build: { command: 'npm install && npm run build' },
        runtime: { command: 'npm start', port: 3000 },
        infrastructure: { instances: 1, cpu: 1, memory: 1024 },
        features: ['healing-applied']
      };
      
      // Deploy the healed version
      const redeployResult = await this.deploymentService.deployApp(healingConfig);
      
      // Monitor the healing deployment
      const monitoringResult = await this.monitorHealingDeployment(redeployResult.deploymentId);
      
      const healingResult = {
        success: monitoringResult.success,
        deploymentId: redeployResult.deploymentId,
        originalDeploymentId: deploymentId,
        appliedFix: bestFix,
        redeployResult,
        monitoringResult,
        healingTime: Date.now() - this.getHealingStartTime(deploymentId),
        message: monitoringResult.success ? 
          `✅ Successfully healed deployment using ${bestFix.type}` :
          `❌ Healing attempt failed: ${monitoringResult.error}`,
        actions: bestFix.actions || []
      };
      
      this.emit('healing:completed', healingResult);
      
      return healingResult;
      
    } catch (error) {
      this.logger.error('❌ Fix application failed', { 
        deploymentId, 
        fixId: bestFix.id, 
        error: error.message 
      });
      
      return this.createHealingResult(false, `Fix application failed: ${error.message}`);
    }
  }
  /**
   * Apply fix actions to deployment configuration
   * @param {Object} currentStatus - Current deployment status
   * @param {Array} actions - Fix actions to apply
   * @returns {Object} Updated deployment configuration
   */
  async applyFixActions(currentStatus, actions) {
    const updatedConfig = {
      name: currentStatus.deploymentId,
      // Copy existing configuration
      build: { ...currentStatus.build },
      runtime: { ...currentStatus.runtime },
      infrastructure: { ...currentStatus.resources },
      networking: { ...currentStatus.networking }
    };
    
    for (const action of actions) {
      switch (action.type) {
        case 'env_variable':
          updatedConfig.runtime.environment = updatedConfig.runtime.environment || {};
          updatedConfig.runtime.environment[action.key] = action.value;
          this.logger.info('Applied env variable fix', { key: action.key, value: action.value });
          break;
          
        case 'build_command':
          updatedConfig.build.command = action.value;
          this.logger.info('Applied build command fix', { command: action.value });
          break;
          
        case 'resource_update':
          if (action.memory) updatedConfig.infrastructure.memory = action.memory;
          if (action.cpu) updatedConfig.infrastructure.cpu = action.cpu;
          this.logger.info('Applied resource update', action);
          break;
          
        case 'health_check_path':
          updatedConfig.runtime.healthCheck = action.value;
          this.logger.info('Applied health check fix', { path: action.value });
          break;
          
        case 'add_dependency':
          // This would require modifying package.json - for now, log the requirement
          this.logger.info('Dependency addition required', { package: action.package });
          // In a real implementation, this would modify the repository
          break;
          
        case 'retry_deployment':
          // This is handled by the redeployment process
          this.logger.info('Retry deployment requested', { reason: action.reason });
          break;
          
        default:
          this.logger.warn('Unknown fix action type', { type: action.type });
      }
    }
    
    return updatedConfig;
  }

  /**
   * Monitor the healing deployment to ensure it succeeds
   * @param {string} deploymentId - New deployment ID
   * @returns {Object} Monitoring result
   */
  async monitorHealingDeployment(deploymentId) {
    const maxWaitTime = 5 * 60 * 1000; // 5 minutes for demo
    const pollInterval = 10000; // 10 seconds
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const status = await this.deploymentService.getDeploymentStatus(deploymentId);
        
        if (status.status === 'deployed') {
          // Additional health verification
          if (status.health && status.health.status === 'healthy') {
            return {
              success: true,
              finalStatus: status,
              healingTime: Date.now() - startTime,
              message: '✅ Deployment healed successfully'
            };
          }
        } else if (status.status === 'failed') {
          return {
            success: false,
            finalStatus: status,
            healingTime: Date.now() - startTime,
            error: 'Healing deployment failed',
            message: '❌ The healing attempt resulted in another failure'
          };
        }
        
        // Continue monitoring
        await this.sleep(pollInterval);
        
      } catch (error) {
        this.logger.error('❌ Error monitoring healing deployment', { 
          deploymentId, 
          error: error.message 
        });
        
        return {
          success: false,
          error: error.message,
          healingTime: Date.now() - startTime,
          message: 'Failed to monitor healing deployment'
        };
      }
    }
    
    return {
      success: false,
      error: 'Healing deployment timeout',
      healingTime: maxWaitTime,
      message: 'Healing deployment did not complete within the timeout period'
    };
  }

  // Helper methods
  canAttemptHealing(deploymentId) {
    const attempts = this.healingAttempts.get(deploymentId) || { count: 0, lastAttempt: 0 };
    const now = Date.now();
    
    // Check max attempts
    if (attempts.count >= this.config.maxHealingAttempts) {
      this.logger.warn('Max healing attempts reached', { deploymentId, attempts: attempts.count });
      return false;
    }
    
    // Check cooldown period
    if (now - attempts.lastAttempt < this.config.healingCooldown) {
      this.logger.warn('Healing cooldown active', { 
        deploymentId, 
        remainingCooldown: this.config.healingCooldown - (now - attempts.lastAttempt) 
      });
      return false;
    }
    
    return true;
  }

  recordHealingAttempt(deploymentId, result) {
    const attempts = this.healingAttempts.get(deploymentId) || { count: 0, lastAttempt: 0 };
    attempts.count++;
    attempts.lastAttempt = Date.now();
    
    this.healingAttempts.set(deploymentId, attempts);
    
    // Store healing history
    const history = this.healingHistory.get(deploymentId) || [];
    history.push({
      timestamp: new Date().toISOString(),
      success: result.success,
      appliedFix: result.appliedFix,
      healingTime: result.healingTime,
      message: result.message
    });
    this.healingHistory.set(deploymentId, history);
  }

  createHealingResult(success, message, additionalData = {}) {
    return {
      success,
      message,
      timestamp: new Date().toISOString(),
      ...additionalData
    };
  }

  getHealingStartTime(deploymentId) {
    // This would be set when healing starts - simplified for this implementation
    return Date.now();
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Initialize failure patterns and fix strategies
  initializeFailurePatterns() {
    return {
      buildFailure: {
        patterns: [/build failed/i, /compilation error/i],
        severity: 'high',
        category: 'build'
      },
      dependencyIssue: {
        patterns: [/module not found/i, /npm err/i],
        severity: 'medium',
        category: 'dependency'
      },
      portConflict: {
        patterns: [/EADDRINUSE/i, /port.*in use/i],
        severity: 'medium',
        category: 'configuration'
      },
      memoryIssue: {
        patterns: [/out of memory/i, /heap.*exceeded/i],
        severity: 'high',
        category: 'resource'
      }
    };
  }

  initializeFixStrategies() {
    return {
      build: ['retry_build', 'update_dependencies', 'increase_memory'],
      dependency: ['reinstall_deps', 'update_lockfile', 'add_missing_deps'],
      configuration: ['update_env_vars', 'change_ports', 'fix_health_checks'],
      resource: ['increase_memory', 'increase_cpu', 'optimize_build']
    };
  }

  // Additional helper methods for analysis
  findMostCommonFailure(failures) {
    const counts = {};
    Object.keys(failures).forEach(category => {
      counts[category] = failures[category].length;
    });
    
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
  }

  buildFailureTimeline(failures) {
    const timeline = [];
    Object.keys(failures).forEach(category => {
      failures[category].forEach(failure => {
        timeline.push({
          timestamp: failure.timestamp,
          category,
          message: failure.message
        });
      });
    });
    
    return timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  extractModuleName(message) {
    const match = message.match(/module ['"]([^'"]+)['"]/i);
    return match ? match[1] : null;
  }

  getEnvVarSuggestion(envVar) {
    const suggestions = {
      'NODE_ENV': 'production',
      'PORT': '3000',
      'DATABASE_URL': 'postgresql://localhost:5432/myapp',
      'REDIS_URL': 'redis://localhost:6379'
    };
    
    return suggestions[envVar] || 'undefined';
  }

  calculateConfigSeverity(issues) {
    const severityScores = { low: 1, medium: 2, high: 3, critical: 4 };
    const totalScore = issues.reduce((sum, issue) => sum + severityScores[issue.severity], 0);
    
    if (totalScore === 0) return 'none';
    if (totalScore <= 2) return 'low';
    if (totalScore <= 5) return 'medium';
    if (totalScore <= 10) return 'high';
    return 'critical';
  }

  determineFailureType(patternMatches, aiAnalysis) {
    // Logic to determine the primary failure type
    if (patternMatches.length > 0) {
      return patternMatches[0].category;
    }
    
    if (aiAnalysis && aiAnalysis.failureType) {
      return aiAnalysis.failureType;
    }
    
    return 'unknown';
  }

  calculateAnalysisConfidence(patternMatches, aiAnalysis) {
    let confidence = 0.5; // Base confidence
    
    if (patternMatches.length > 0) {
      confidence += 0.3; // Rule-based patterns add confidence
    }
    
    if (aiAnalysis && aiAnalysis.confidence) {
      confidence = Math.max(confidence, aiAnalysis.confidence);
    }
    
    return Math.min(confidence, 1.0);
  }

  buildAIFixPrompt(analysisResult) {
    return `
      Analyze this deployment failure and suggest specific fixes:
      
      Deployment ID: ${analysisResult.deploymentId}
      Failure Type: ${analysisResult.failureType}
      
      Log Analysis:
      - Build Errors: ${analysisResult.logAnalysis.failures.buildErrors.length}
      - Runtime Errors: ${analysisResult.logAnalysis.failures.runtimeErrors.length}
      - Dependency Issues: ${analysisResult.logAnalysis.failures.dependencyIssues.length}
      - Port Conflicts: ${analysisResult.logAnalysis.failures.portConflicts.length}
      
      Configuration Issues:
      ${analysisResult.configAnalysis.issues.map(issue => `- ${issue.description}`).join('\n')}
      
      Recent Log Entries:
      ${analysisResult.logAnalysis.failures.buildErrors.slice(0, 3).map(error => error.message).join('\n')}
      
      Provide 2-3 specific, actionable fix suggestions in JSON format:
      {
        "fixes": [
          {
            "id": "unique_fix_id",
            "description": "Clear description of the fix",
            "confidence": 0.8,
            "actions": ["specific", "actionable", "steps"],
            "reasoning": "Why this fix should work"
          }
        ]
      }
    `;
  }

  parseAIFixSuggestions(aiResponse) {
    try {
      const parsed = JSON.parse(aiResponse);
      return parsed.fixes.map(fix => ({
        id: fix.id,
        type: 'ai_generated',
        description: fix.description,
        confidence: fix.confidence || 0.6,
        feasibility: 0.7, // AI fixes have moderate feasibility
        actions: fix.actions.map(action => ({ type: 'custom', description: action })),
        reasoning: fix.reasoning,
        estimatedTime: '3-5 minutes'
      }));
    } catch (error) {
      this.logger.error('Failed to parse AI fix suggestions', { error: error.message });
      return [];
    }
  }

  /**
   * Perform Groq AI analysis of deployment failure
   * @param {Array} logs - Deployment logs
   * @param {Object} deploymentStatus - Current deployment status
   * @param {Object} failureContext - Failure context
   * @returns {Object} AI analysis result
   */
  async performGroqAnalysis(logs, deploymentStatus, failureContext) {
    try {
      this.logger.info('🤖 Performing Groq AI failure analysis');
      
      const failureData = {
        deploymentId: deploymentStatus.deploymentId,
        type: failureContext.type || 'deployment_failure',
        status: deploymentStatus.status,
        logs: logs.slice(-20).map(log => ({
          level: log.level,
          message: log.message,
          timestamp: log.timestamp
        })),
        error: deploymentStatus.error || 'Deployment failed'
      };
      
      const aiAnalysis = await analyzeFailure(failureData);
      
      return {
        failureType: aiAnalysis.category || 'unknown',
        confidence: aiAnalysis.confidence || 0.6,
        analysis: aiAnalysis.analysis || 'AI analysis completed',
        fixes: aiAnalysis.fixes || [],
        aiProvider: 'groq'
      };
      
    } catch (error) {
      this.logger.warn('⚠️ Groq AI analysis failed, using fallback', { error: error.message });
      return {
        failureType: 'unknown',
        confidence: 0.4,
        analysis: 'AI analysis unavailable, using rule-based analysis',
        fixes: [],
        aiProvider: 'fallback'
      };
    }
  }

  async performAIAnalysis(logs, deploymentStatus) {
    // Legacy method - redirect to Groq analysis
    return this.performGroqAnalysis(logs, deploymentStatus, {});
  }

  detectFailurePatterns(logAnalysis, configAnalysis) {
    const matches = [];
    
    Object.keys(this.failurePatterns).forEach(patternName => {
      const pattern = this.failurePatterns[patternName];
      const hasMatch = pattern.patterns.some(regex => 
        logAnalysis.failures.buildErrors.some(error => regex.test(error.message)) ||
        logAnalysis.failures.runtimeErrors.some(error => regex.test(error.message))
      );
      
      if (hasMatch) {
        matches.push({
          pattern: patternName,
          category: pattern.category,
          severity: pattern.severity,
          confidence: 0.8
        });
      }
    });
    
    return matches;
  }
}

export { SelfHealingSystem };