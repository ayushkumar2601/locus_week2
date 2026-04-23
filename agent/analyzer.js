/**
 * Analyzer Agent - Analyzes logs, detects errors, and suggests fixes
 * Provides intelligent error detection and automated fix suggestions
 */

const axios = require('axios');
const EventEmitter = require('events');

class AnalyzerAgent extends EventEmitter {
  constructor(options = {}) {
    super();
    this.aiProvider = options.aiProvider || 'openai';
    this.apiKeys = options.apiKeys || {};
    this.logger = options.logger || console;
    this.analysisCache = new Map();
    this.errorPatterns = this.initializeErrorPatterns();
    this.fixSuggestions = this.initializeFixSuggestions();
    this.analysisHistory = new Map(); // Track analysis history for learning
  }

  /**
   * Analyze deployment logs and detect issues
   * @param {string} deploymentId - Deployment identifier
   * @param {Array} logs - Array of log entries
   * @param {Object} context - Additional context (deployment info, etc.)
   * @returns {Object} Analysis result with errors and suggestions
   */
  async analyze(deploymentId, logs, context = {}) {
    try {
      this.logger.info('Starting log analysis', { deploymentId, logCount: logs.length });
      
      const analysisId = this.generateAnalysisId();
      const startTime = Date.now();

      // Step 1: Preprocess logs
      const processedLogs = await this.preprocessLogs(logs);
      
      // Step 2: Detect errors using pattern matching
      const patternErrors = await this.detectPatternErrors(processedLogs);
      
      // Step 3: AI-powered error analysis
      const aiErrors = await this.detectAIErrors(processedLogs, context);
      
      // Step 4: Classify and prioritize errors
      const classifiedErrors = await this.classifyErrors([...patternErrors, ...aiErrors]);
      
      // Step 5: Generate fix suggestions
      const fixSuggestions = await this.generateFixSuggestions(classifiedErrors, context);
      
      // Step 6: Analyze trends and patterns
      const trendAnalysis = await this.analyzeTrends(deploymentId, classifiedErrors);

      const analysis = {
        id: analysisId,
        deploymentId,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        summary: {
          totalLogs: logs.length,
          errorsFound: classifiedErrors.length,
          criticalErrors: classifiedErrors.filter(e => e.severity === 'critical').length,
          fixableErrors: fixSuggestions.filter(f => f.confidence > 0.7).length
        },
        errors: classifiedErrors,
        suggestions: fixSuggestions,
        trends: trendAnalysis,
        recommendations: this.generateRecommendations(classifiedErrors, trendAnalysis),
        confidence: this.calculateOverallConfidence(classifiedErrors, fixSuggestions)
      };

      // Store analysis for learning
      this.storeAnalysis(deploymentId, analysis);
      
      this.emit('analysis:completed', analysis);
      this.logger.info('Analysis completed', { 
        analysisId, 
        errorsFound: analysis.summary.errorsFound,
        duration: analysis.duration 
      });

      return analysis;

    } catch (error) {
      this.logger.error('Analysis failed', { deploymentId, error: error.message, stack: error.stack });
      throw new AnalyzerError(`Analysis failed: ${error.message}`, error);
    }
  }

  /**
   * Preprocess logs for analysis
   */
  async preprocessLogs(logs) {
    return logs.map(log => {
      // Normalize log format
      const normalized = {
        timestamp: this.parseTimestamp(log.timestamp || log.time),
        level: this.normalizeLogLevel(log.level || log.severity),
        message: log.message || log.msg || log.text || '',
        source: log.source || log.component || 'unknown',
        metadata: log.metadata || log.data || {},
        raw: log
      };

      // Extract structured information
      normalized.structured = this.extractStructuredInfo(normalized.message);
      
      // Detect error indicators
      normalized.isError = this.isErrorLog(normalized);
      
      return normalized;
    }).filter(log => log.message.trim().length > 0); // Remove empty logs
  }

  /**
   * Detect errors using predefined patterns
   */
  async detectPatternErrors(logs) {
    const errors = [];

    for (const log of logs) {
      for (const [category, patterns] of Object.entries(this.errorPatterns)) {
        for (const pattern of patterns) {
          if (pattern.regex.test(log.message)) {
            errors.push({
              id: this.generateErrorId(),
              type: 'pattern',
              category,
              severity: pattern.severity,
              message: log.message,
              timestamp: log.timestamp,
              source: log.source,
              pattern: pattern.name,
              description: pattern.description,
              log: log,
              confidence: 0.9
            });
            break; // Only match first pattern per category
          }
        }
      }
    }

    return errors;
  }

  /**
   * Detect errors using AI analysis
   */
  async detectAIErrors(logs, context) {
    if (!this.apiKeys.openai) {
      this.logger.warn('AI provider not configured, skipping AI error detection');
      return [];
    }

    try {
      // Sample logs for AI analysis (to avoid token limits)
      const errorLogs = logs.filter(log => log.isError || log.level === 'error');
      const warningLogs = logs.filter(log => log.level === 'warn').slice(0, 10);
      const sampleLogs = [...errorLogs, ...warningLogs].slice(0, 50);

      if (sampleLogs.length === 0) {
        return [];
      }

      const prompt = this.buildAIAnalysisPrompt(sampleLogs, context);
      const aiResponse = await this.callAI({ prompt, maxTokens: 2000 });
      
      const aiAnalysis = JSON.parse(aiResponse);
      
      return aiAnalysis.errors.map(error => ({
        id: this.generateErrorId(),
        type: 'ai',
        category: error.category,
        severity: error.severity,
        message: error.message,
        description: error.description,
        rootCause: error.rootCause,
        impact: error.impact,
        confidence: error.confidence || 0.8,
        aiGenerated: true
      }));

    } catch (error) {
      this.logger.warn('AI error detection failed', { error: error.message });
      return [];
    }
  }

  /**
   * Classify and prioritize errors
   */
  async classifyErrors(errors) {
    // Remove duplicates
    const uniqueErrors = this.deduplicateErrors(errors);
    
    // Sort by severity and confidence
    return uniqueErrors.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const severityDiff = (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
      
      if (severityDiff !== 0) return severityDiff;
      return (b.confidence || 0) - (a.confidence || 0);
    });
  }

  /**
   * Generate fix suggestions for detected errors
   */
  async generateFixSuggestions(errors, context) {
    const suggestions = [];

    for (const error of errors) {
      // Try pattern-based suggestions first
      const patternSuggestion = this.getPatternBasedSuggestion(error);
      if (patternSuggestion) {
        suggestions.push(patternSuggestion);
        continue;
      }

      // Try AI-powered suggestions
      const aiSuggestion = await this.getAISuggestion(error, context);
      if (aiSuggestion) {
        suggestions.push(aiSuggestion);
      }
    }

    return suggestions;
  }

  /**
   * Get pattern-based fix suggestion
   */
  getPatternBasedSuggestion(error) {
    const suggestion = this.fixSuggestions[error.category];
    if (!suggestion) return null;

    return {
      id: this.generateSuggestionId(),
      errorId: error.id,
      type: 'pattern',
      category: error.category,
      title: suggestion.title,
      description: suggestion.description,
      steps: suggestion.steps,
      automated: suggestion.automated || false,
      confidence: 0.8,
      estimatedTime: suggestion.estimatedTime,
      difficulty: suggestion.difficulty
    };
  }

  /**
   * Get AI-powered fix suggestion
   */
  async getAISuggestion(error, context) {
    if (!this.apiKeys.openai) return null;

    try {
      const prompt = `Analyze this error and provide a fix suggestion:

Error Details:
- Category: ${error.category}
- Severity: ${error.severity}
- Message: ${error.message}
- Description: ${error.description || 'N/A'}

Context:
- Stack: ${context.stack || 'unknown'}
- Environment: ${context.environment || 'production'}
- Deployment Type: ${context.deploymentType || 'standard'}

Provide a JSON response with:
{
  "title": "Brief fix title",
  "description": "Detailed explanation of the fix",
  "steps": ["Step 1", "Step 2", "Step 3"],
  "automated": true/false,
  "confidence": 0.0-1.0,
  "estimatedTime": "time estimate",
  "difficulty": "easy/medium/hard",
  "preventionTips": ["tip1", "tip2"]
}`;

      const aiResponse = await this.callAI({ prompt, maxTokens: 1000 });
      const suggestion = JSON.parse(aiResponse);

      return {
        id: this.generateSuggestionId(),
        errorId: error.id,
        type: 'ai',
        category: error.category,
        ...suggestion,
        aiGenerated: true
      };

    } catch (error) {
      this.logger.warn('AI suggestion generation failed', { error: error.message });
      return null;
    }
  }

  /**
   * Analyze trends and patterns in errors
   */
  async analyzeTrends(deploymentId, errors) {
    const history = this.analysisHistory.get(deploymentId) || [];
    
    const trends = {
      recurring: this.findRecurringErrors(errors, history),
      frequency: this.analyzeErrorFrequency(errors),
      timeline: this.analyzeErrorTimeline(errors),
      categories: this.analyzeErrorCategories(errors),
      severity: this.analyzeSeverityTrends(errors, history)
    };

    return trends;
  }

  /**
   * Generate overall recommendations
   */
  generateRecommendations(errors, trends) {
    const recommendations = [];

    // Critical error recommendations
    const criticalErrors = errors.filter(e => e.severity === 'critical');
    if (criticalErrors.length > 0) {
      recommendations.push({
        type: 'immediate',
        priority: 'high',
        title: 'Address Critical Errors',
        description: `${criticalErrors.length} critical errors detected that require immediate attention`,
        actions: ['Review critical errors', 'Implement fixes', 'Monitor closely']
      });
    }

    // Recurring error recommendations
    if (trends.recurring.length > 0) {
      recommendations.push({
        type: 'pattern',
        priority: 'medium',
        title: 'Fix Recurring Issues',
        description: `${trends.recurring.length} recurring error patterns detected`,
        actions: ['Analyze root causes', 'Implement permanent fixes', 'Add monitoring']
      });
    }

    // Performance recommendations
    const performanceErrors = errors.filter(e => e.category === 'performance');
    if (performanceErrors.length > 0) {
      recommendations.push({
        type: 'optimization',
        priority: 'medium',
        title: 'Performance Optimization',
        description: 'Performance issues detected that may impact user experience',
        actions: ['Profile application', 'Optimize bottlenecks', 'Scale resources']
      });
    }

    return recommendations;
  }

  // Utility methods
  initializeErrorPatterns() {
    return {
      build: [
        {
          name: 'npm_install_failed',
          regex: /npm ERR!|yarn error|package not found/i,
          severity: 'high',
          description: 'Package installation failed'
        },
        {
          name: 'compilation_error',
          regex: /compilation failed|syntax error|cannot resolve/i,
          severity: 'critical',
          description: 'Code compilation failed'
        }
      ],
      runtime: [
        {
          name: 'uncaught_exception',
          regex: /uncaught exception|unhandled rejection|fatal error/i,
          severity: 'critical',
          description: 'Uncaught runtime exception'
        },
        {
          name: 'memory_error',
          regex: /out of memory|heap out of memory|memory limit/i,
          severity: 'high',
          description: 'Memory allocation error'
        }
      ],
      database: [
        {
          name: 'connection_failed',
          regex: /connection refused|connection timeout|database error/i,
          severity: 'high',
          description: 'Database connection failed'
        },
        {
          name: 'query_error',
          regex: /sql error|query failed|constraint violation/i,
          severity: 'medium',
          description: 'Database query error'
        }
      ],
      network: [
        {
          name: 'request_timeout',
          regex: /request timeout|connection timeout|network error/i,
          severity: 'medium',
          description: 'Network request timeout'
        },
        {
          name: 'rate_limited',
          regex: /rate limit|too many requests|429/i,
          severity: 'medium',
          description: 'Rate limit exceeded'
        }
      ],
      performance: [
        {
          name: 'slow_response',
          regex: /slow query|response time|performance warning/i,
          severity: 'low',
          description: 'Performance degradation detected'
        }
      ]
    };
  }

  initializeFixSuggestions() {
    return {
      build: {
        title: 'Fix Build Issues',
        description: 'Resolve package installation and compilation errors',
        steps: [
          'Clear package cache (npm cache clean --force)',
          'Delete node_modules and package-lock.json',
          'Reinstall dependencies (npm install)',
          'Check for version conflicts'
        ],
        automated: true,
        estimatedTime: '5-10 minutes',
        difficulty: 'easy'
      },
      runtime: {
        title: 'Fix Runtime Errors',
        description: 'Address uncaught exceptions and runtime issues',
        steps: [
          'Add proper error handling',
          'Implement try-catch blocks',
          'Add logging for debugging',
          'Review recent code changes'
        ],
        automated: false,
        estimatedTime: '15-30 minutes',
        difficulty: 'medium'
      },
      database: {
        title: 'Fix Database Issues',
        description: 'Resolve database connection and query problems',
        steps: [
          'Check database connectivity',
          'Verify connection string',
          'Review database logs',
          'Optimize queries if needed'
        ],
        automated: false,
        estimatedTime: '10-20 minutes',
        difficulty: 'medium'
      },
      network: {
        title: 'Fix Network Issues',
        description: 'Resolve network connectivity and timeout problems',
        steps: [
          'Check network connectivity',
          'Increase timeout values',
          'Implement retry logic',
          'Review firewall settings'
        ],
        automated: false,
        estimatedTime: '10-15 minutes',
        difficulty: 'easy'
      },
      performance: {
        title: 'Optimize Performance',
        description: 'Improve application performance and response times',
        steps: [
          'Profile application performance',
          'Identify bottlenecks',
          'Optimize database queries',
          'Scale resources if needed'
        ],
        automated: false,
        estimatedTime: '30-60 minutes',
        difficulty: 'hard'
      }
    };
  }

  buildAIAnalysisPrompt(logs, context) {
    const logSample = logs.slice(0, 20).map(log => 
      `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`
    ).join('\n');

    return `Analyze these application logs and identify errors:

Context:
- Stack: ${context.stack || 'unknown'}
- Environment: ${context.environment || 'production'}

Logs:
${logSample}

Identify and categorize errors. Return JSON format:
{
  "errors": [
    {
      "category": "build|runtime|database|network|performance",
      "severity": "critical|high|medium|low",
      "message": "error message",
      "description": "detailed description",
      "rootCause": "likely root cause",
      "impact": "impact description",
      "confidence": 0.0-1.0
    }
  ]
}`;
  }

  parseTimestamp(timestamp) {
    if (!timestamp) return new Date();
    if (timestamp instanceof Date) return timestamp;
    return new Date(timestamp);
  }

  normalizeLogLevel(level) {
    if (!level) return 'info';
    const normalized = level.toLowerCase();
    const levelMap = {
      'err': 'error',
      'warn': 'warning',
      'warning': 'warn',
      'information': 'info',
      'debug': 'debug',
      'trace': 'debug'
    };
    return levelMap[normalized] || normalized;
  }

  extractStructuredInfo(message) {
    const info = {};
    
    // Extract HTTP status codes
    const statusMatch = message.match(/\b([1-5]\d{2})\b/);
    if (statusMatch) info.statusCode = parseInt(statusMatch[1]);
    
    // Extract response times
    const timeMatch = message.match(/(\d+(?:\.\d+)?)\s*ms/);
    if (timeMatch) info.responseTime = parseFloat(timeMatch[1]);
    
    // Extract memory usage
    const memoryMatch = message.match(/(\d+(?:\.\d+)?)\s*MB/);
    if (memoryMatch) info.memoryUsage = parseFloat(memoryMatch[1]);
    
    return info;
  }

  isErrorLog(log) {
    if (log.level === 'error' || log.level === 'fatal') return true;
    if (log.structured.statusCode >= 400) return true;
    
    const errorKeywords = ['error', 'exception', 'failed', 'crash', 'fatal'];
    return errorKeywords.some(keyword => 
      log.message.toLowerCase().includes(keyword)
    );
  }

  deduplicateErrors(errors) {
    const seen = new Set();
    return errors.filter(error => {
      const key = `${error.category}-${error.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  findRecurringErrors(currentErrors, history) {
    const recurring = [];
    const errorSignatures = currentErrors.map(e => `${e.category}-${e.message}`);
    
    for (const analysis of history) {
      for (const error of analysis.errors) {
        const signature = `${error.category}-${error.message}`;
        if (errorSignatures.includes(signature)) {
          recurring.push({
            signature,
            occurrences: history.filter(h => 
              h.errors.some(e => `${e.category}-${e.message}` === signature)
            ).length + 1
          });
        }
      }
    }
    
    return recurring.filter(r => r.occurrences > 1);
  }

  analyzeErrorFrequency(errors) {
    const frequency = {};
    for (const error of errors) {
      frequency[error.category] = (frequency[error.category] || 0) + 1;
    }
    return frequency;
  }

  analyzeErrorTimeline(errors) {
    return errors.map(error => ({
      timestamp: error.timestamp,
      category: error.category,
      severity: error.severity
    })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  analyzeErrorCategories(errors) {
    const categories = {};
    for (const error of errors) {
      if (!categories[error.category]) {
        categories[error.category] = { count: 0, severities: {} };
      }
      categories[error.category].count++;
      categories[error.category].severities[error.severity] = 
        (categories[error.category].severities[error.severity] || 0) + 1;
    }
    return categories;
  }

  analyzeSeverityTrends(errors, history) {
    const current = this.analyzeErrorFrequency(errors);
    const previous = history.length > 0 ? 
      this.analyzeErrorFrequency(history[history.length - 1].errors) : {};
    
    const trends = {};
    for (const [category, count] of Object.entries(current)) {
      const prevCount = previous[category] || 0;
      trends[category] = {
        current: count,
        previous: prevCount,
        trend: count > prevCount ? 'increasing' : count < prevCount ? 'decreasing' : 'stable'
      };
    }
    
    return trends;
  }

  calculateOverallConfidence(errors, suggestions) {
    if (errors.length === 0) return 1.0;
    
    const avgErrorConfidence = errors.reduce((sum, e) => sum + (e.confidence || 0.5), 0) / errors.length;
    const avgSuggestionConfidence = suggestions.length > 0 ? 
      suggestions.reduce((sum, s) => sum + (s.confidence || 0.5), 0) / suggestions.length : 0.5;
    
    return (avgErrorConfidence + avgSuggestionConfidence) / 2;
  }

  storeAnalysis(deploymentId, analysis) {
    const history = this.analysisHistory.get(deploymentId) || [];
    history.push(analysis);
    
    // Keep only last 10 analyses
    if (history.length > 10) {
      history.shift();
    }
    
    this.analysisHistory.set(deploymentId, history);
  }

  async callAI({ prompt, maxTokens = 500 }) {
    if (!this.apiKeys.openai) {
      throw new Error('AI provider API key not configured');
    }

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
  }

  generateAnalysisId() {
    return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateErrorId() {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateSuggestionId() {
    return `suggestion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

class AnalyzerError extends Error {
  constructor(message, originalError) {
    super(message);
    this.name = 'AnalyzerError';
    this.originalError = originalError;
  }
}

module.exports = { AnalyzerAgent, AnalyzerError };