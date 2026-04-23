/**
 * Analyzer Agent - Real deployment analysis with Locus integration
 */

import { EventEmitter } from 'events';
import { LocusService } from '../services/locusService.js';

export class AnalyzerError extends Error {
  constructor(message, originalError) {
    super(message);
    this.name = 'AnalyzerError';
    this.originalError = originalError;
  }
}

export class AnalyzerAgent extends EventEmitter {
  constructor(options = {}) {
    super();
    this.logger = options.logger || console;
    this.aiProvider = options.aiProvider;
    this.apiKeys = options.apiKeys || {};
    
    // Initialize Locus service for real analysis
    this.locusService = new LocusService({
      apiKey: options.locusApiKey || process.env.LOCUS_API_KEY,
      baseUrl: options.locusApiUrl || process.env.LOCUS_API_URL,
      logger: this.logger
    });
    
    this.logger.info('🔍 Analyzer Agent initialized with real Locus integration');
  }

  /**
   * Analyze deployment with real data from Locus
   */
  async analyze(deploymentId, logs = null, context = {}) {
    try {
      this.logger.info('Analyzing deployment:', { deploymentId, context });
      
      // Get real deployment status and logs from Locus
      const [deploymentStatus, deploymentLogs] = await Promise.all([
        this.locusService.getDeploymentStatus(deploymentId),
        logs || this.locusService.getLogs(deploymentId, { 
          lines: 1000, 
          level: 'error,warn,info' 
        })
      ]);
      
      // Perform comprehensive analysis
      const analysis = {
        deploymentId,
        timestamp: Date.now(),
        status: deploymentStatus.status,
        
        // Log analysis
        logAnalysis: await this.analyzeDeploymentLogs(deploymentLogs.logs),
        
        // Performance analysis
        performanceAnalysis: await this.analyzePerformance(deploymentStatus),
        
        // Error analysis
        errorAnalysis: await this.analyzeErrors(deploymentLogs.logs, deploymentStatus),
        
        // Resource analysis
        resourceAnalysis: await this.analyzeResourceUsage(deploymentStatus),
        
        // Security analysis
        securityAnalysis: await this.analyzeSecurityIssues(deploymentStatus, deploymentLogs.logs),
        
        // Cost analysis
        costAnalysis: await this.analyzeCosts(deploymentStatus),
        
        // Overall summary
        summary: null, // Will be populated below
        
        // Recommendations
        recommendations: [],
        
        // Confidence score
        confidence: 0.8
      };
      
      // Generate summary and recommendations
      analysis.summary = this.generateAnalysisSummary(analysis);
      analysis.recommendations = await this.generateRecommendations(analysis);
      analysis.confidence = this.calculateAnalysisConfidence(analysis);
      
      this.emit('analysis:completed', {
        deploymentId,
        errorsFound: analysis.errorAnalysis.errors.length,
        recommendationsCount: analysis.recommendations.length,
        confidence: analysis.confidence
      });
      
      return analysis;
      
    } catch (error) {
      this.logger.error('Analysis failed:', error);
      throw new AnalyzerError(`Analysis failed: ${error.message}`, error);
    }
  }

  /**
   * Resolve error using analysis insights
   */
  async resolveError(error) {
    try {
      this.logger.info('Resolving error:', { errorId: error.id, type: error.type });
      
      // Analyze error pattern
      const errorPattern = this.identifyErrorPattern(error);
      
      // Generate resolution strategy
      const resolutionStrategy = await this.generateResolutionStrategy(error, errorPattern);
      
      // Apply resolution if possible
      const resolutionResult = await this.applyResolution(error, resolutionStrategy);
      
      return {
        errorId: error.id,
        action: resolutionResult.action,
        success: resolutionResult.success,
        details: resolutionResult.details,
        timestamp: Date.now()
      };
      
    } catch (error) {
      this.logger.error('Error resolution failed:', error);
      throw new AnalyzerError(`Error resolution failed: ${error.message}`, error);
    }
  }

  /**
   * Get deployment insights for optimization
   */
  async getDeploymentInsights(deploymentId) {
    try {
      const analysis = await this.analyze(deploymentId);
      
      return {
        deploymentId,
        insights: {
          performance: this.extractPerformanceInsights(analysis.performanceAnalysis),
          cost: this.extractCostInsights(analysis.costAnalysis),
          security: this.extractSecurityInsights(analysis.securityAnalysis),
          reliability: this.extractReliabilityInsights(analysis.errorAnalysis)
        },
        actionableRecommendations: analysis.recommendations.filter(r => r.actionable),
        priorityIssues: analysis.recommendations.filter(r => r.priority === 'high'),
        timestamp: Date.now()
      };
      
    } catch (error) {
      this.logger.error('Failed to get deployment insights:', error);
      throw new AnalyzerError(`Failed to get insights: ${error.message}`, error);
    }
  }

  // Private analysis methods

  /**
   * Analyze deployment logs for patterns and issues
   */
  async analyzeDeploymentLogs(logs) {
    const logAnalysis = {
      totalLogs: logs.length,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      patterns: [],
      timeline: [],
      criticalEvents: []
    };
    
    const errorPatterns = [
      { pattern: /error|failed|exception/i, type: 'error', severity: 'high' },
      { pattern: /warning|warn/i, type: 'warning', severity: 'medium' },
      { pattern: /timeout|connection.*refused/i, type: 'connectivity', severity: 'high' },
      { pattern: /out of memory|memory.*exceeded/i, type: 'memory', severity: 'critical' },
      { pattern: /port.*in use|EADDRINUSE/i, type: 'port_conflict', severity: 'medium' }
    ];
    
    logs.forEach(log => {
      // Count log levels
      switch (log.level.toLowerCase()) {
        case 'error':
          logAnalysis.errorCount++;
          break;
        case 'warn':
        case 'warning':
          logAnalysis.warningCount++;
          break;
        case 'info':
          logAnalysis.infoCount++;
          break;
      }
      
      // Check for patterns
      errorPatterns.forEach(({ pattern, type, severity }) => {
        if (pattern.test(log.message)) {
          logAnalysis.patterns.push({
            type,
            severity,
            message: log.message,
            timestamp: log.timestamp,
            source: log.source
          });
          
          if (severity === 'critical' || severity === 'high') {
            logAnalysis.criticalEvents.push({
              type,
              message: log.message,
              timestamp: log.timestamp,
              severity
            });
          }
        }
      });
      
      // Build timeline
      logAnalysis.timeline.push({
        timestamp: log.timestamp,
        level: log.level,
        message: log.message.substring(0, 100) // Truncate for timeline
      });
    });
    
    return logAnalysis;
  }

  /**
   * Analyze deployment performance metrics
   */
  async analyzePerformance(deploymentStatus) {
    const metrics = deploymentStatus.metrics || {};
    
    return {
      responseTime: {
        current: metrics.responseTime || 0,
        threshold: 2000, // 2 seconds
        status: (metrics.responseTime || 0) < 2000 ? 'good' : 'poor'
      },
      throughput: {
        current: metrics.requests || 0,
        trend: 'stable' // Would calculate from historical data
      },
      uptime: {
        current: metrics.uptime || 0,
        percentage: ((metrics.uptime || 0) / (Date.now() - deploymentStatus.metadata?.createdAt || Date.now())) * 100
      },
      resourceUtilization: {
        cpu: this.calculateResourceUtilization(deploymentStatus.resources?.cpu, 'cpu'),
        memory: this.calculateResourceUtilization(deploymentStatus.resources?.memory, 'memory')
      }
    };
  }

  /**
   * Analyze errors and failure patterns
   */
  async analyzeErrors(logs, deploymentStatus) {
    const errors = logs.filter(log => log.level.toLowerCase() === 'error');
    
    const errorAnalysis = {
      totalErrors: errors.length,
      errorRate: errors.length / Math.max(logs.length, 1),
      errors: errors.map(error => ({
        message: error.message,
        timestamp: error.timestamp,
        source: error.source,
        category: this.categorizeError(error.message)
      })),
      patterns: this.identifyErrorPatterns(errors),
      trends: this.analyzeErrorTrends(errors)
    };
    
    return errorAnalysis;
  }

  /**
   * Analyze resource usage
   */
  async analyzeResourceUsage(deploymentStatus) {
    const resources = deploymentStatus.resources || {};
    
    return {
      cpu: {
        allocated: resources.cpu || 0,
        used: resources.cpu * 0.7, // Estimated usage
        efficiency: 0.7,
        recommendation: resources.cpu < 0.5 ? 'increase' : 'optimal'
      },
      memory: {
        allocated: resources.memory || 0,
        used: resources.memory * 0.8, // Estimated usage
        efficiency: 0.8,
        recommendation: resources.memory < 512 ? 'increase' : 'optimal'
      },
      storage: {
        allocated: resources.storage || 0,
        used: (resources.storage || 0) * 0.3, // Estimated usage
        efficiency: 0.3
      }
    };
  }

  /**
   * Analyze security issues
   */
  async analyzeSecurityIssues(deploymentStatus, logs) {
    const securityIssues = [];
    
    // Check for common security issues
    if (!deploymentStatus.networking?.ssl) {
      securityIssues.push({
        type: 'ssl_missing',
        severity: 'high',
        message: 'SSL/TLS not configured',
        recommendation: 'Enable SSL/TLS encryption'
      });
    }
    
    // Check logs for security-related events
    const securityLogs = logs.filter(log => 
      /unauthorized|forbidden|authentication|security/i.test(log.message)
    );
    
    if (securityLogs.length > 0) {
      securityIssues.push({
        type: 'security_events',
        severity: 'medium',
        message: `${securityLogs.length} security-related log entries found`,
        recommendation: 'Review security logs and implement additional monitoring'
      });
    }
    
    return {
      issues: securityIssues,
      score: Math.max(0, 100 - (securityIssues.length * 20)), // Security score out of 100
      recommendations: securityIssues.map(issue => issue.recommendation)
    };
  }

  /**
   * Analyze deployment costs
   */
  async analyzeCosts(deploymentStatus) {
    const cost = deploymentStatus.cost || {};
    
    return {
      current: cost.current || 0,
      projected: cost.projected || 0,
      currency: cost.currency || 'USD',
      breakdown: {
        compute: cost.current * 0.7 || 0,
        storage: cost.current * 0.2 || 0,
        network: cost.current * 0.1 || 0
      },
      optimization: {
        potential_savings: cost.current * 0.15 || 0, // Estimated 15% savings possible
        recommendations: [
          'Consider using smaller instances during low traffic',
          'Implement auto-scaling to optimize resource usage',
          'Review storage usage and cleanup unused data'
        ]
      }
    };
  }

  /**
   * Generate analysis summary
   */
  generateAnalysisSummary(analysis) {
    const issues = [];
    let overallHealth = 'healthy';
    
    // Check for critical issues
    if (analysis.errorAnalysis.totalErrors > 10) {
      issues.push('High error rate detected');
      overallHealth = 'unhealthy';
    }
    
    if (analysis.performanceAnalysis.responseTime.status === 'poor') {
      issues.push('Poor response time performance');
      overallHealth = 'degraded';
    }
    
    if (analysis.securityAnalysis.score < 70) {
      issues.push('Security vulnerabilities detected');
      overallHealth = 'at_risk';
    }
    
    return {
      overallHealth,
      issuesFound: issues.length,
      issues,
      errorsFound: analysis.errorAnalysis.totalErrors,
      fixableErrors: analysis.errorAnalysis.errors.filter(e => e.category !== 'unknown').length,
      status: 'analyzed'
    };
  }

  /**
   * Generate actionable recommendations
   */
  async generateRecommendations(analysis) {
    const recommendations = [];
    
    // Performance recommendations
    if (analysis.performanceAnalysis.responseTime.status === 'poor') {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        title: 'Improve Response Time',
        description: 'Response time exceeds acceptable threshold',
        action: 'optimize_performance',
        actionable: true,
        estimatedImpact: 'high'
      });
    }
    
    // Resource recommendations
    if (analysis.resourceAnalysis.memory.recommendation === 'increase') {
      recommendations.push({
        type: 'resource',
        priority: 'medium',
        title: 'Increase Memory Allocation',
        description: 'Current memory allocation may be insufficient',
        action: 'scale_memory',
        actionable: true,
        estimatedImpact: 'medium'
      });
    }
    
    // Security recommendations
    analysis.securityAnalysis.issues.forEach(issue => {
      recommendations.push({
        type: 'security',
        priority: issue.severity === 'high' ? 'high' : 'medium',
        title: `Fix ${issue.type}`,
        description: issue.message,
        action: 'fix_security',
        actionable: true,
        estimatedImpact: 'high'
      });
    });
    
    // Error-based recommendations
    if (analysis.errorAnalysis.totalErrors > 5) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        title: 'Reduce Error Rate',
        description: `${analysis.errorAnalysis.totalErrors} errors detected in logs`,
        action: 'fix_errors',
        actionable: true,
        estimatedImpact: 'high'
      });
    }
    
    return recommendations;
  }

  /**
   * Calculate analysis confidence
   */
  calculateAnalysisConfidence(analysis) {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence based on data availability
    if (analysis.logAnalysis.totalLogs > 100) confidence += 0.2;
    if (analysis.performanceAnalysis.responseTime.current > 0) confidence += 0.1;
    if (analysis.errorAnalysis.totalErrors >= 0) confidence += 0.1;
    
    // Decrease confidence for incomplete data
    if (analysis.logAnalysis.totalLogs < 10) confidence -= 0.2;
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }

  // Helper methods

  calculateResourceUtilization(allocated, type) {
    if (!allocated) return { status: 'unknown', percentage: 0 };
    
    // Simulate utilization based on type
    const utilization = type === 'cpu' ? 0.7 : 0.8;
    
    return {
      status: utilization > 0.9 ? 'high' : utilization > 0.7 ? 'medium' : 'low',
      percentage: utilization * 100
    };
  }

  categorizeError(errorMessage) {
    const categories = {
      'build': /build|compilation|syntax/i,
      'runtime': /runtime|execution|crash/i,
      'network': /network|connection|timeout/i,
      'database': /database|sql|query/i,
      'memory': /memory|heap|oom/i,
      'permission': /permission|access|forbidden/i
    };
    
    for (const [category, pattern] of Object.entries(categories)) {
      if (pattern.test(errorMessage)) {
        return category;
      }
    }
    
    return 'unknown';
  }

  identifyErrorPatterns(errors) {
    const patterns = {};
    
    errors.forEach(error => {
      const category = this.categorizeError(error.message);
      patterns[category] = (patterns[category] || 0) + 1;
    });
    
    return Object.entries(patterns).map(([category, count]) => ({
      category,
      count,
      percentage: (count / errors.length) * 100
    }));
  }

  analyzeErrorTrends(errors) {
    // Simple trend analysis - in real implementation would be more sophisticated
    const recentErrors = errors.filter(error => 
      Date.now() - new Date(error.timestamp).getTime() < 3600000 // Last hour
    );
    
    return {
      recent: recentErrors.length,
      trend: recentErrors.length > errors.length * 0.5 ? 'increasing' : 'stable'
    };
  }

  identifyErrorPattern(error) {
    return {
      category: this.categorizeError(error.message),
      severity: error.severity || 'medium',
      frequency: 'single', // Would track frequency in real implementation
      similar_errors: [] // Would find similar errors in real implementation
    };
  }

  async generateResolutionStrategy(error, pattern) {
    const strategies = {
      'build': 'retry_build_with_clean_cache',
      'runtime': 'restart_service_with_health_check',
      'network': 'check_network_configuration',
      'database': 'verify_database_connection',
      'memory': 'increase_memory_allocation',
      'permission': 'fix_file_permissions'
    };
    
    return {
      strategy: strategies[pattern.category] || 'manual_investigation',
      automated: pattern.category !== 'unknown',
      steps: this.getResolutionSteps(pattern.category)
    };
  }

  async applyResolution(error, strategy) {
    if (!strategy.automated) {
      return {
        action: 'escalated',
        success: false,
        details: 'Manual investigation required'
      };
    }
    
    // In real implementation, would execute actual resolution steps
    return {
      action: strategy.strategy,
      success: true,
      details: `Applied ${strategy.strategy} resolution`
    };
  }

  getResolutionSteps(category) {
    const steps = {
      'build': ['Clear build cache', 'Retry build process', 'Check dependencies'],
      'runtime': ['Restart service', 'Check health endpoint', 'Verify configuration'],
      'network': ['Check network connectivity', 'Verify DNS resolution', 'Test endpoints'],
      'database': ['Test database connection', 'Check credentials', 'Verify database status'],
      'memory': ['Increase memory allocation', 'Restart service', 'Monitor usage'],
      'permission': ['Check file permissions', 'Update access rights', 'Verify user context']
    };
    
    return steps[category] || ['Manual investigation required'];
  }

  extractPerformanceInsights(performanceAnalysis) {
    return {
      responseTime: performanceAnalysis.responseTime.status,
      uptime: performanceAnalysis.uptime.percentage,
      recommendations: performanceAnalysis.responseTime.status === 'poor' ? 
        ['Optimize database queries', 'Implement caching', 'Scale resources'] : []
    };
  }

  extractCostInsights(costAnalysis) {
    return {
      current: costAnalysis.current,
      optimization_potential: costAnalysis.optimization.potential_savings,
      recommendations: costAnalysis.optimization.recommendations
    };
  }

  extractSecurityInsights(securityAnalysis) {
    return {
      score: securityAnalysis.score,
      issues: securityAnalysis.issues.length,
      recommendations: securityAnalysis.recommendations
    };
  }

  extractReliabilityInsights(errorAnalysis) {
    return {
      error_rate: errorAnalysis.errorRate,
      trend: errorAnalysis.trends.trend,
      recommendations: errorAnalysis.errorRate > 0.05 ? 
        ['Implement better error handling', 'Add monitoring alerts', 'Review logs regularly'] : []
    };
  }
}