/**
 * Agent Memory System - Persistent learning and pattern recognition
 * Stores deployment history, errors, fixes, and successful configurations
 */

import { promises as fs } from 'fs';
import path from 'path';
import { EventEmitter } from 'events';

const MEMORY_FILE = path.join(process.cwd(), 'memory', 'history.json');

export class AgentMemory extends EventEmitter {
  constructor(options = {}) {
    super();
    this.logger = options.logger || console;
    this.memory = {
      repositories: {},
      patterns: {
        commonErrors: {},
        successfulFixes: {},
        configTemplates: {}
      },
      statistics: {
        totalDeployments: 0,
        successfulDeployments: 0,
        totalErrors: 0,
        fixedErrors: 0
      },
      lastUpdated: Date.now()
    };
    
    this.autoSaveInterval = options.autoSaveInterval || 30000; // 30 seconds
    this.maxHistoryEntries = options.maxHistoryEntries || 1000;
    
    this.initialize();
  }

  /**
   * Initialize memory system
   */
  async initialize() {
    try {
      await this.ensureMemoryDirectory();
      await this.loadMemory();
      this.startAutoSave();
      this.logger.info('🧠 Agent Memory System initialized');
    } catch (error) {
      this.logger.error('Failed to initialize memory system:', error);
    }
  }

  /**
   * Ensure memory directory exists
   */
  async ensureMemoryDirectory() {
    const memoryDir = path.dirname(MEMORY_FILE);
    try {
      await fs.access(memoryDir);
    } catch (error) {
      await fs.mkdir(memoryDir, { recursive: true });
      this.logger.info('Created memory directory:', memoryDir);
    }
  }

  /**
   * Load memory from file
   */
  async loadMemory() {
    try {
      const data = await fs.readFile(MEMORY_FILE, 'utf8');
      const loadedMemory = JSON.parse(data);
      
      // Merge with default structure to handle schema updates
      this.memory = {
        ...this.memory,
        ...loadedMemory,
        patterns: {
          ...this.memory.patterns,
          ...loadedMemory.patterns
        },
        statistics: {
          ...this.memory.statistics,
          ...loadedMemory.statistics
        }
      };
      
      this.logger.info('Memory loaded successfully', {
        repositories: Object.keys(this.memory.repositories).length,
        totalDeployments: this.memory.statistics.totalDeployments
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.logger.info('No existing memory file, starting fresh');
        await this.saveMemory();
      } else {
        this.logger.error('Failed to load memory:', error);
      }
    }
  }

  /**
   * Save memory to file
   */
  async saveMemory() {
    try {
      this.memory.lastUpdated = Date.now();
      const data = JSON.stringify(this.memory, null, 2);
      await fs.writeFile(MEMORY_FILE, data, 'utf8');
      this.emit('memory:saved', { timestamp: Date.now() });
    } catch (error) {
      this.logger.error('Failed to save memory:', error);
      this.emit('memory:save_failed', { error: error.message });
    }
  }

  /**
   * Start auto-save interval
   */
  startAutoSave() {
    setInterval(() => {
      this.saveMemory();
    }, this.autoSaveInterval);
  }

  /**
   * Get memory for a specific repository
   */
  getMemory(repoId) {
    const repoMemory = this.memory.repositories[repoId];
    if (!repoMemory) {
      return null;
    }

    return {
      ...repoMemory,
      patterns: this.getRelevantPatterns(repoMemory),
      recommendations: this.generateRecommendations(repoMemory)
    };
  }

  /**
   * Update memory for a repository
   */
  updateMemory(repoId, data) {
    if (!this.memory.repositories[repoId]) {
      this.memory.repositories[repoId] = {
        id: repoId,
        url: data.url || '',
        deployments: [],
        errors: [],
        fixes: [],
        successfulConfigs: [],
        firstSeen: Date.now(),
        lastDeployment: null,
        successCount: 0,
        errorCount: 0
      };
    }

    const repo = this.memory.repositories[repoId];
    
    // Update deployment history
    if (data.deployment) {
      repo.deployments.push({
        ...data.deployment,
        timestamp: Date.now()
      });
      repo.lastDeployment = Date.now();
      
      if (data.deployment.success) {
        repo.successCount++;
        this.memory.statistics.successfulDeployments++;
      }
      
      this.memory.statistics.totalDeployments++;
    }

    // Update errors
    if (data.errors && Array.isArray(data.errors)) {
      data.errors.forEach(error => {
        repo.errors.push({
          message: error.message || error,
          type: error.type || 'unknown',
          timestamp: Date.now(),
          resolved: false
        });
        
        // Update pattern tracking
        const errorKey = this.normalizeError(error.message || error);
        this.memory.patterns.commonErrors[errorKey] = 
          (this.memory.patterns.commonErrors[errorKey] || 0) + 1;
      });
      
      repo.errorCount += data.errors.length;
      this.memory.statistics.totalErrors += data.errors.length;
    }

    // Update fixes
    if (data.fixes && Array.isArray(data.fixes)) {
      data.fixes.forEach(fix => {
        repo.fixes.push({
          description: fix.description || fix,
          action: fix.action || 'unknown',
          timestamp: Date.now(),
          effective: fix.effective !== false
        });
        
        // Update pattern tracking
        if (fix.effective !== false) {
          const fixKey = this.normalizeFix(fix.description || fix);
          this.memory.patterns.successfulFixes[fixKey] = 
            (this.memory.patterns.successfulFixes[fixKey] || 0) + 1;
          
          this.memory.statistics.fixedErrors++;
        }
      });
    }

    // Update successful configurations
    if (data.config && data.success) {
      repo.successfulConfigs.push({
        ...data.config,
        timestamp: Date.now(),
        deploymentId: data.deploymentId
      });
      
      // Update config templates
      const configKey = this.generateConfigKey(data.config);
      if (!this.memory.patterns.configTemplates[configKey]) {
        this.memory.patterns.configTemplates[configKey] = {
          config: data.config,
          usageCount: 0,
          successRate: 0
        };
      }
      
      this.memory.patterns.configTemplates[configKey].usageCount++;
      this.memory.patterns.configTemplates[configKey].successRate = 
        (this.memory.patterns.configTemplates[configKey].successRate + (data.success ? 1 : 0)) / 
        this.memory.patterns.configTemplates[configKey].usageCount;
    }

    // Cleanup old entries if needed
    this.cleanupOldEntries(repo);
    
    this.emit('memory:updated', { repoId, data });
    return repo;
  }

  /**
   * Get patterns and insights
   */
  getPatterns() {
    const patterns = {
      mostCommonErrors: this.getMostCommonErrors(10),
      mostEffectiveFixes: this.getMostEffectiveFixes(10),
      bestConfigs: this.getBestConfigs(5),
      insights: this.generateInsights()
    };

    return patterns;
  }

  /**
   * Get most common errors
   */
  getMostCommonErrors(limit = 10) {
    return Object.entries(this.memory.patterns.commonErrors)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([error, count]) => ({ error, count }));
  }

  /**
   * Get most effective fixes
   */
  getMostEffectiveFixes(limit = 10) {
    return Object.entries(this.memory.patterns.successfulFixes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([fix, count]) => ({ fix, count }));
  }

  /**
   * Get best performing configurations
   */
  getBestConfigs(limit = 5) {
    return Object.values(this.memory.patterns.configTemplates)
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, limit);
  }

  /**
   * Generate insights from patterns
   */
  generateInsights() {
    const insights = [];
    const stats = this.memory.statistics;
    
    // Success rate insight
    const successRate = stats.totalDeployments > 0 ? 
      (stats.successfulDeployments / stats.totalDeployments) * 100 : 0;
    
    insights.push({
      type: 'success_rate',
      message: `Overall deployment success rate: ${successRate.toFixed(1)}%`,
      value: successRate,
      trend: this.calculateSuccessTrend()
    });

    // Error resolution insight
    const resolutionRate = stats.totalErrors > 0 ? 
      (stats.fixedErrors / stats.totalErrors) * 100 : 0;
    
    insights.push({
      type: 'resolution_rate',
      message: `Error resolution rate: ${resolutionRate.toFixed(1)}%`,
      value: resolutionRate,
      trend: this.calculateResolutionTrend()
    });

    // Most problematic patterns
    const topError = this.getMostCommonErrors(1)[0];
    if (topError) {
      insights.push({
        type: 'top_issue',
        message: `Most common issue: "${topError.error}" (${topError.count} occurrences)`,
        value: topError.count,
        recommendation: this.getRecommendationForError(topError.error)
      });
    }

    return insights;
  }

  /**
   * Get relevant patterns for a repository
   */
  getRelevantPatterns(repoMemory) {
    // Find similar repositories based on tech stack, errors, etc.
    const similarRepos = this.findSimilarRepositories(repoMemory);
    
    return {
      similarRepositories: similarRepos.slice(0, 3),
      recommendedFixes: this.getRecommendedFixes(repoMemory),
      suggestedConfigs: this.getSuggestedConfigs(repoMemory)
    };
  }

  /**
   * Generate recommendations for a repository
   */
  generateRecommendations(repoMemory) {
    const recommendations = [];
    
    // Based on error history
    if (repoMemory.errors.length > 0) {
      const recentErrors = repoMemory.errors.slice(-5);
      recentErrors.forEach(error => {
        const fix = this.getRecommendationForError(error.message);
        if (fix) {
          recommendations.push({
            type: 'error_fix',
            priority: 'high',
            message: `For "${error.message}": ${fix}`,
            confidence: this.calculateFixConfidence(error.message)
          });
        }
      });
    }

    // Based on successful patterns
    const bestConfig = this.getBestConfigForRepo(repoMemory);
    if (bestConfig) {
      recommendations.push({
        type: 'config_suggestion',
        priority: 'medium',
        message: 'Consider using proven configuration template',
        config: bestConfig.config,
        confidence: bestConfig.successRate
      });
    }

    return recommendations;
  }

  // Helper methods
  normalizeError(error) {
    return error.toLowerCase()
      .replace(/\d+/g, 'N')
      .replace(/['"]/g, '')
      .trim();
  }

  normalizeFix(fix) {
    return fix.toLowerCase().trim();
  }

  generateConfigKey(config) {
    const key = {
      stack: config.stack?.primary || 'unknown',
      framework: config.frameworks?.[0] || 'unknown',
      database: config.database?.type || 'none'
    };
    return JSON.stringify(key);
  }

  cleanupOldEntries(repo) {
    const maxEntries = Math.floor(this.maxHistoryEntries / 4); // Divide among 4 arrays
    
    if (repo.deployments.length > maxEntries) {
      repo.deployments = repo.deployments.slice(-maxEntries);
    }
    if (repo.errors.length > maxEntries) {
      repo.errors = repo.errors.slice(-maxEntries);
    }
    if (repo.fixes.length > maxEntries) {
      repo.fixes = repo.fixes.slice(-maxEntries);
    }
    if (repo.successfulConfigs.length > maxEntries) {
      repo.successfulConfigs = repo.successfulConfigs.slice(-maxEntries);
    }
  }

  findSimilarRepositories(repoMemory) {
    // Simple similarity based on error patterns and tech stack
    return Object.values(this.memory.repositories)
      .filter(repo => repo.id !== repoMemory.id)
      .map(repo => ({
        ...repo,
        similarity: this.calculateSimilarity(repoMemory, repo)
      }))
      .sort((a, b) => b.similarity - a.similarity);
  }

  calculateSimilarity(repo1, repo2) {
    // Simple similarity calculation based on common errors
    const errors1 = new Set(repo1.errors.map(e => this.normalizeError(e.message)));
    const errors2 = new Set(repo2.errors.map(e => this.normalizeError(e.message)));
    
    const intersection = new Set([...errors1].filter(x => errors2.has(x)));
    const union = new Set([...errors1, ...errors2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  getRecommendationForError(error) {
    const normalizedError = this.normalizeError(error);
    
    // Simple rule-based recommendations
    const recommendations = {
      'port already in use': 'Use dynamic port assignment or check for port conflicts',
      'module not found': 'Verify dependencies are properly installed',
      'permission denied': 'Check file permissions and user access rights',
      'connection refused': 'Ensure service is running and accessible',
      'timeout': 'Increase timeout values or optimize performance',
      'out of memory': 'Increase memory allocation or optimize memory usage'
    };

    for (const [pattern, recommendation] of Object.entries(recommendations)) {
      if (normalizedError.includes(pattern)) {
        return recommendation;
      }
    }

    return null;
  }

  calculateFixConfidence(error) {
    const normalizedError = this.normalizeError(error);
    const fixCount = this.memory.patterns.successfulFixes[normalizedError] || 0;
    const errorCount = this.memory.patterns.commonErrors[normalizedError] || 1;
    
    return Math.min(fixCount / errorCount, 1.0);
  }

  getBestConfigForRepo(repoMemory) {
    // Find the best config template based on success rate
    const configs = Object.values(this.memory.patterns.configTemplates)
      .filter(template => template.successRate > 0.7)
      .sort((a, b) => b.successRate - a.successRate);
    
    return configs[0] || null;
  }

  calculateSuccessTrend() {
    // Simple trend calculation based on recent deployments
    const recentDeployments = Object.values(this.memory.repositories)
      .flatMap(repo => repo.deployments)
      .filter(deployment => Date.now() - deployment.timestamp < 7 * 24 * 60 * 60 * 1000) // Last 7 days
      .sort((a, b) => a.timestamp - b.timestamp);

    if (recentDeployments.length < 2) return 'stable';

    const firstHalf = recentDeployments.slice(0, Math.floor(recentDeployments.length / 2));
    const secondHalf = recentDeployments.slice(Math.floor(recentDeployments.length / 2));

    const firstHalfSuccess = firstHalf.filter(d => d.success).length / firstHalf.length;
    const secondHalfSuccess = secondHalf.filter(d => d.success).length / secondHalf.length;

    if (secondHalfSuccess > firstHalfSuccess + 0.1) return 'improving';
    if (secondHalfSuccess < firstHalfSuccess - 0.1) return 'declining';
    return 'stable';
  }

  calculateResolutionTrend() {
    // Similar to success trend but for error resolution
    return 'stable'; // Simplified for now
  }

  getRecommendedFixes(repoMemory) {
    return this.getMostEffectiveFixes(5);
  }

  getSuggestedConfigs(repoMemory) {
    return this.getBestConfigs(3);
  }

  /**
   * Get memory statistics
   */
  getStatistics() {
    return {
      ...this.memory.statistics,
      repositoryCount: Object.keys(this.memory.repositories).length,
      patternCount: {
        errors: Object.keys(this.memory.patterns.commonErrors).length,
        fixes: Object.keys(this.memory.patterns.successfulFixes).length,
        configs: Object.keys(this.memory.patterns.configTemplates).length
      }
    };
  }

  /**
   * Clear all memory (for testing/reset)
   */
  async clearMemory() {
    this.memory = {
      repositories: {},
      patterns: {
        commonErrors: {},
        successfulFixes: {},
        configTemplates: {}
      },
      statistics: {
        totalDeployments: 0,
        successfulDeployments: 0,
        totalErrors: 0,
        fixedErrors: 0
      },
      lastUpdated: Date.now()
    };
    
    await this.saveMemory();
    this.emit('memory:cleared');
  }
}