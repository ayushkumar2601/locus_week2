/**
 * AI Agent Brain - Central Intelligence System
 * Implements continuous agent lifecycle: observe → think → decide → act → reflect
 * Orchestrates the entire autonomous deployment system
 */

import { EventEmitter } from 'events';
import { NLPDeploymentParser } from './nlpDeploymentParser.js';
import { ConversationalDeployment } from './conversationalDeployment.js';
import { AgentMemory } from './memory.js';

class AgentBrain extends EventEmitter {
  constructor(options = {}) {
    super();
    this.logger = options.logger || console;
    this.isRunning = false;
    this.loopInterval = options.loopInterval || parseInt(process.env.AGENT_LOOP_INTERVAL) || 5000;
    this.maxConcurrentActions = options.maxConcurrentActions || parseInt(process.env.MAX_CONCURRENT_ACTIONS) || 3;
    
    // Initialize system components with proper dependency injection
    this.planner = options.planner;
    this.deployer = options.deployer;
    this.analyzer = options.analyzer;
    this.monitor = options.monitor;
    this.selfHealer = options.selfHealer;
    
    // Initialize NLP and conversational components
    this.nlpParser = new NLPDeploymentParser(options);
    this.conversationalDeployment = new ConversationalDeployment(options);
    this.persistentMemory = new AgentMemory({ logger: this.logger });
    
    // AI provider configuration
    this.aiProvider = process.env.AI_PROVIDER || options.aiProvider || 'groq';
    
    // Memory and state management (separate from persistent memory)
    this.memory = {
      observations: [],
      thoughts: [],
      decisions: [],
      actions: [],
      reflections: [],
      maxMemorySize: 1000
    };
    
    // System state tracking
    this.systemState = {
      deployments: new Map(),
      errors: [],
      userInputs: [],
      lastObservation: null,
      activeActions: new Set()
    };
    
    this.logger.info('🧠 Agent Brain initialized - Central Intelligence System ready', {
      aiProvider: this.aiProvider,
      loopInterval: this.loopInterval,
      maxConcurrentActions: this.maxConcurrentActions
    });
  }

  /**
   * Start the continuous agent loop
   */
  async startAgentLoop() {
    if (this.isRunning) {
      this.logger.warn('Agent loop already running');
      return;
    }
    
    this.isRunning = true;
    this.logger.info('🚀 Starting Agent Brain continuous loop');
    this.emit('brain:started');
    
    // Start the main cognitive loop
    this.cognitiveLoop();
  }

  /**
   * Stop the agent loop
   */
  async stopAgentLoop() {
    this.isRunning = false;
    this.logger.info('🛑 Stopping Agent Brain loop');
    this.emit('brain:stopped');
  }

  /**
   * Main cognitive loop: observe → think → decide → act → reflect
   */
  async cognitiveLoop() {
    while (this.isRunning) {
      try {
        const cycleStart = Date.now();
        
        // 1. OBSERVE: Collect system state
        const observation = await this.observe();
        
        // 2. THINK: Process observation with reasoning
        const thought = await this.think(observation);
        
        // 3. DECIDE: Convert reasoning into actionable decisions
        const decision = await this.decide(thought);
        
        // 4. ACT: Execute decisions through system modules
        const result = await this.act(decision);
        
        // 5. REFLECT: Learn from results and update memory
        await this.reflect({
          observation,
          thought,
          decision,
          result,
          cycleTime: Date.now() - cycleStart
        });
        
        // Wait before next cycle
        await this.sleep(this.loopInterval);
        
      } catch (error) {
        this.logger.error('🚨 Agent Brain cycle error:', error);
        this.emit('brain:error', error);
        
        // Continue running even if one cycle fails
        await this.sleep(this.loopInterval);
      }
    }
  }
  /**
   * OBSERVE: Collect comprehensive system state
   */
  async observe() {
    const observationStart = Date.now();
    
    try {
      const observation = {
        timestamp: Date.now(),
        deployments: await this.observeDeployments(),
        errors: await this.observeErrors(),
        userInputs: await this.observeUserInputs(),
        systemHealth: await this.observeSystemHealth(),
        resources: await this.observeResources(),
        context: await this.observeContext()
      };
      
      // Store observation in memory
      this.addToMemory('observations', observation);
      this.systemState.lastObservation = observation;
      
      // Emit thinking log
      this.emitThinkingLog('OBSERVE', `System scan: ${observation.deployments.length} deployments, ${observation.errors.length} errors, ${observation.userInputs.length} inputs`);
      
      // Emit observation event
      this.emit('brain:observation', observation);
      this.logger.debug('👁️ Agent observation completed', {
        deployments: observation.deployments.length,
        errors: observation.errors.length,
        userInputs: observation.userInputs.length,
        observationTime: Date.now() - observationStart
      });
      
      return observation;
      
    } catch (error) {
      this.logger.error('❌ Observation failed:', error);
      this.emitThinkingLog('ERROR', `Observation failed: ${error.message}`);
      return {
        timestamp: Date.now(),
        error: error.message,
        deployments: [],
        errors: [error.message],
        userInputs: [],
        systemHealth: { status: 'error' },
        resources: {},
        context: {}
      };
    }
  }

  /**
   * Observe current deployments
   */
  async observeDeployments() {
    try {
      // Use monitor agent if available, otherwise return empty array
      if (this.monitor && typeof this.monitor.listActiveDeployments === 'function') {
        const activeDeployments = await this.monitor.listActiveDeployments();
        const deploymentStates = [];
        
        for (const deployment of activeDeployments) {
          const status = await this.monitor.getDeploymentStatus(deployment.id);
          deploymentStates.push({
            id: deployment.id,
            name: deployment.name,
            status: status.status,
            health: status.health,
            lastUpdate: status.lastUpdate,
            errors: status.errors || [],
            metrics: status.metrics || {}
          });
        }
        
        return deploymentStates;
      }
      
      // Fallback: check system state deployments
      const deploymentStates = [];
      for (const [id, deployment] of this.systemState.deployments) {
        deploymentStates.push({
          id,
          name: deployment.name || id,
          status: deployment.status || 'unknown',
          health: deployment.health || 'unknown',
          lastUpdate: deployment.lastUpdate || Date.now(),
          errors: deployment.errors || [],
          metrics: deployment.metrics || {}
        });
      }
      
      return deploymentStates;
    } catch (error) {
      this.logger.warn('Failed to observe deployments:', error.message);
      return [];
    }
  }

  /**
   * Observe system errors
   */
  async observeErrors() {
    try {
      // Collect errors from various sources
      const errors = [
        ...this.systemState.errors,
        ...this.getRecentLogErrors(),
        ...await this.getDeploymentErrors()
      ];
      
      // Deduplicate and sort by severity
      const uniqueErrors = this.deduplicateErrors(errors);
      return uniqueErrors.slice(0, 50); // Limit to recent errors
      
    } catch (error) {
      this.logger.warn('Failed to observe errors:', error.message);
      return [];
    }
  }

  /**
   * Observe user inputs from various channels
   */
  async observeUserInputs() {
    try {
      const inputs = [
        ...this.systemState.userInputs,
        ...await this.getNLPInputs(),
        ...await this.getGitHubEvents(),
        ...await this.getAPIRequests()
      ];
      
      // Sort by timestamp and limit
      return inputs
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 20);
        
    } catch (error) {
      this.logger.warn('Failed to observe user inputs:', error.message);
      return [];
    }
  }

  /**
   * Observe system health metrics
   */
  async observeSystemHealth() {
    try {
      return {
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        activeConnections: this.systemState.activeActions.size,
        lastHealthCheck: Date.now()
      };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Observe resource utilization
   */
  async observeResources() {
    try {
      return {
        memory: {
          used: process.memoryUsage().heapUsed,
          total: process.memoryUsage().heapTotal,
          percentage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100
        },
        activeDeployments: this.systemState.deployments.size,
        queuedActions: this.systemState.activeActions.size,
        memoryEntries: Object.values(this.memory).reduce((sum, arr) => sum + arr.length, 0)
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Observe contextual information
   */
  async observeContext() {
    return {
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      recentActivity: this.getRecentActivity(),
      trends: this.analyzeTrends()
    };
  }
  /**
   * THINK: Process observation with AI reasoning using Groq
   */
  async think(observation) {
    const thinkingStart = Date.now();
    
    try {
      let reasoning = [];
      let confidence = 0.7;
      let priority = 'medium';
      
      // Use Groq AI for intelligent reasoning
      if (this.aiProvider === 'groq') {
        try {
          const { generateDeploymentReasoning } = await import('./llm/groqClient.js');
          const aiReasoning = await generateDeploymentReasoning(observation);
          
          reasoning = aiReasoning.reasoning;
          confidence = aiReasoning.confidence;
          priority = aiReasoning.priority;
          
          this.logger.info('🤖 Groq AI reasoning generated:', {
            steps: reasoning.length,
            confidence: (confidence * 100).toFixed(0) + '%',
            priority
          });
          
        } catch (groqError) {
          this.logger.warn('Groq AI reasoning failed, falling back to rule-based:', groqError.message);
          const fallbackReasoning = await this.ruleBasedThinking(observation);
          reasoning = fallbackReasoning;
          confidence = 0.6;
        }
      } else {
        // Fallback to rule-based reasoning
        reasoning = await this.ruleBasedThinking(observation);
      }
      
      const thought = {
        timestamp: Date.now(),
        observation: observation.timestamp,
        reasoning,
        confidence,
        priority,
        thinkingTime: Date.now() - thinkingStart,
        aiProvider: this.aiProvider || 'rule-based'
      };
      
      // Store thought in memory
      this.addToMemory('thoughts', thought);
      
      // Emit thinking log with dynamic reasoning
      const reasoningPreview = reasoning[0] || 'Processing system state';
      this.emitThinkingLog('THINK', `${reasoningPreview} (confidence: ${(confidence * 100).toFixed(0)}%, priority: ${priority})`);
      
      // Emit thinking event
      this.emit('brain:thought', thought);
      this.logger.debug('🤔 Agent thinking completed', {
        reasoningSteps: reasoning.length,
        confidence: thought.confidence,
        priority: thought.priority,
        thinkingTime: thought.thinkingTime,
        aiProvider: thought.aiProvider
      });
      
      return thought;
      
    } catch (error) {
      this.logger.error('❌ Thinking failed:', error);
      return {
        timestamp: Date.now(),
        observation: observation.timestamp,
        reasoning: [`Error in thinking process: ${error.message}`],
        confidence: 0.1,
        priority: 'low',
        error: error.message,
        aiProvider: 'error'
      };
    }
  }

  /**
   * AI-powered thinking using LLM
   */
  async aiThinking(observation) {
    try {
      const prompt = this.buildThinkingPrompt(observation);
      
      const response = await this.aiProvider.analyze({
        prompt,
        temperature: 0.3,
        maxTokens: 500
      });
      
      return this.parseAIReasoning(response);
      
    } catch (error) {
      this.logger.warn('AI thinking failed, falling back to rule-based:', error.message);
      return await this.ruleBasedThinking(observation);
    }
  }

  /**
   * Rule-based thinking when AI is unavailable
   */
  async ruleBasedThinking(observation) {
    const reasoning = [];
    
    // Analyze deployments
    if (observation.deployments.length > 0) {
      const failedDeployments = observation.deployments.filter(d => d.status === 'failed');
      const pendingDeployments = observation.deployments.filter(d => d.status === 'pending');
      
      if (failedDeployments.length > 0) {
        reasoning.push(`Detected ${failedDeployments.length} failed deployment(s) requiring attention`);
        reasoning.push('Failed deployments may need self-healing intervention');
      }
      
      if (pendingDeployments.length > 3) {
        reasoning.push(`High number of pending deployments (${pendingDeployments.length}) detected`);
        reasoning.push('System may be under heavy load or experiencing bottlenecks');
      }
    }
    
    // Analyze errors
    if (observation.errors.length > 0) {
      const criticalErrors = observation.errors.filter(e => e.severity === 'critical');
      const recentErrors = observation.errors.filter(e => Date.now() - e.timestamp < 300000); // 5 minutes
      
      if (criticalErrors.length > 0) {
        reasoning.push(`Critical errors detected: ${criticalErrors.length} requiring immediate action`);
      }
      
      if (recentErrors.length > 5) {
        reasoning.push('High error rate detected in recent activity');
        reasoning.push('System stability may be compromised');
      }
    }
    
    // Analyze user inputs
    if (observation.userInputs.length > 0) {
      const nlpInputs = observation.userInputs.filter(i => i.type === 'nlp');
      const githubEvents = observation.userInputs.filter(i => i.type === 'github');
      
      if (nlpInputs.length > 0) {
        reasoning.push(`New natural language deployment requests: ${nlpInputs.length}`);
      }
      
      if (githubEvents.length > 0) {
        reasoning.push(`GitHub events detected: ${githubEvents.length} requiring processing`);
      }
    }
    
    // Analyze system health
    if (observation.systemHealth.status !== 'healthy') {
      reasoning.push('System health issues detected');
      reasoning.push('Performance monitoring and optimization may be needed');
    }
    
    // Analyze resource usage
    if (observation.resources.memory?.percentage > 80) {
      reasoning.push('High memory usage detected (>80%)');
      reasoning.push('Memory cleanup or scaling may be required');
    }
    
    // Default reasoning if no issues detected
    if (reasoning.length === 0) {
      reasoning.push('System operating normally');
      reasoning.push('Monitoring for new deployment requests and system changes');
    }
    
    return reasoning;
  }

  /**
   * Build AI thinking prompt
   */
  buildThinkingPrompt(observation) {
    return `
Analyze the following system observation and provide reasoning steps:

System State:
- Active Deployments: ${observation.deployments.length}
- Recent Errors: ${observation.errors.length}
- User Inputs: ${observation.userInputs.length}
- System Health: ${observation.systemHealth.status}
- Memory Usage: ${observation.resources.memory?.percentage || 0}%

Recent Activity:
${observation.deployments.map(d => `- ${d.name}: ${d.status}`).join('\n')}

Errors:
${observation.errors.slice(0, 3).map(e => `- ${e.message}`).join('\n')}

Provide 3-5 reasoning steps about:
1. Current system state assessment
2. Potential issues or opportunities
3. Recommended actions or monitoring focus

Format as JSON array of reasoning strings.
    `;
  }

  /**
   * Parse AI reasoning response
   */
  parseAIReasoning(response) {
    try {
      const parsed = JSON.parse(response);
      return Array.isArray(parsed) ? parsed : [response];
    } catch (error) {
      // If JSON parsing fails, split by lines
      return response.split('\n').filter(line => line.trim().length > 0);
    }
  }

  /**
   * Calculate confidence in reasoning
   */
  calculateConfidence(reasoning, observation) {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence based on data quality
    if (observation.deployments.length > 0) confidence += 0.1;
    if (observation.errors.length === 0) confidence += 0.1;
    if (observation.systemHealth.status === 'healthy') confidence += 0.1;
    if (reasoning.length >= 3) confidence += 0.1;
    
    // Decrease confidence for uncertainty indicators
    if (reasoning.some(r => r.includes('may') || r.includes('might'))) confidence -= 0.1;
    if (observation.errors.length > 5) confidence -= 0.1;
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * Calculate priority level
   */
  calculatePriority(reasoning, observation) {
    // Check for critical indicators
    const criticalKeywords = ['critical', 'failed', 'error', 'down', 'urgent'];
    const hasCritical = reasoning.some(r => 
      criticalKeywords.some(keyword => r.toLowerCase().includes(keyword))
    );
    
    if (hasCritical) return 'high';
    
    // Check for moderate priority indicators
    const moderateKeywords = ['warning', 'pending', 'high', 'load', 'memory'];
    const hasModerate = reasoning.some(r => 
      moderateKeywords.some(keyword => r.toLowerCase().includes(keyword))
    );
    
    if (hasModerate) return 'medium';
    
    return 'low';
  }
  /**
   * DECIDE: Convert reasoning into actionable decisions
   */
  async decide(thought) {
    const decisionStart = Date.now();
    
    try {
      const decisions = [];
      
      // Analyze reasoning to determine actions
      for (const reasoning of thought.reasoning) {
        const actions = this.reasoningToActions(reasoning, thought);
        decisions.push(...actions);
      }
      
      // Prioritize and filter decisions
      const prioritizedDecisions = this.prioritizeDecisions(decisions, thought);
      
      const decision = {
        timestamp: Date.now(),
        thought: thought.timestamp,
        actions: prioritizedDecisions,
        priority: thought.priority,
        confidence: thought.confidence,
        decisionTime: Date.now() - decisionStart
      };
      
      // Store decision in memory
      this.addToMemory('decisions', decision);
      
      // Emit thinking log
      const actionTypes = decision.actions.map(a => a.type).join(', ');
      this.emitThinkingLog('DECIDE', `Planning actions: ${actionTypes || 'monitor'} (priority: ${decision.priority})`);
      
      // Emit decision event
      this.emit('brain:decision', decision);
      this.logger.debug('🎯 Agent decision completed', {
        actions: decision.actions.length,
        priority: decision.priority,
        confidence: decision.confidence,
        decisionTime: decision.decisionTime
      });
      
      return decision;
      
    } catch (error) {
      this.logger.error('❌ Decision making failed:', error);
      return {
        timestamp: Date.now(),
        thought: thought.timestamp,
        actions: [],
        priority: 'low',
        confidence: 0.1,
        error: error.message
      };
    }
  }

  /**
   * Convert reasoning to specific actions
   */
  reasoningToActions(reasoning, thought) {
    const actions = [];
    const lowerReasoning = reasoning.toLowerCase();
    
    // Deployment-related actions
    if (lowerReasoning.includes('failed deployment')) {
      actions.push({
        type: 'heal_deployment',
        target: 'failed_deployments',
        priority: 'high',
        reasoning: reasoning
      });
    }
    
    if (lowerReasoning.includes('pending deployment') && lowerReasoning.includes('high')) {
      actions.push({
        type: 'monitor_queue',
        target: 'deployment_queue',
        priority: 'medium',
        reasoning: reasoning
      });
    }
    
    // Error handling actions
    if (lowerReasoning.includes('critical error')) {
      actions.push({
        type: 'handle_critical_error',
        target: 'system_errors',
        priority: 'high',
        reasoning: reasoning
      });
    }
    
    if (lowerReasoning.includes('high error rate')) {
      actions.push({
        type: 'analyze_error_patterns',
        target: 'error_analysis',
        priority: 'medium',
        reasoning: reasoning
      });
    }
    
    // User input actions
    if (lowerReasoning.includes('natural language') || lowerReasoning.includes('nlp')) {
      actions.push({
        type: 'process_nlp_requests',
        target: 'nlp_queue',
        priority: 'medium',
        reasoning: reasoning
      });
    }
    
    if (lowerReasoning.includes('github event')) {
      actions.push({
        type: 'process_github_events',
        target: 'github_queue',
        priority: 'medium',
        reasoning: reasoning
      });
    }
    
    // System health actions
    if (lowerReasoning.includes('memory') && lowerReasoning.includes('high')) {
      actions.push({
        type: 'optimize_memory',
        target: 'system_resources',
        priority: 'medium',
        reasoning: reasoning
      });
    }
    
    if (lowerReasoning.includes('system health')) {
      actions.push({
        type: 'health_check',
        target: 'system_health',
        priority: 'low',
        reasoning: reasoning
      });
    }
    
    // Monitoring actions
    if (lowerReasoning.includes('monitoring') || lowerReasoning.includes('operating normally')) {
      actions.push({
        type: 'monitor',
        target: 'system_state',
        priority: 'low',
        reasoning: reasoning
      });
    }
    
    return actions;
  }

  /**
   * Prioritize and filter decisions
   */
  prioritizeDecisions(decisions, thought) {
    // Remove duplicates
    const uniqueDecisions = decisions.filter((decision, index, self) => 
      index === self.findIndex(d => d.type === decision.type && d.target === decision.target)
    );
    
    // Sort by priority
    const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
    uniqueDecisions.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
    
    // Limit concurrent actions
    return uniqueDecisions.slice(0, this.maxConcurrentActions);
  }

  /**
   * ACT: Execute decisions through system modules
   */
  async act(decision) {
    const actionStart = Date.now();
    
    try {
      const results = [];
      
      // Execute each action
      for (const action of decision.actions) {
        if (this.systemState.activeActions.size >= this.maxConcurrentActions) {
          this.logger.warn('Max concurrent actions reached, queuing action:', action.type);
          continue;
        }
        
        const actionId = `${action.type}_${Date.now()}`;
        this.systemState.activeActions.add(actionId);
        
        try {
          const result = await this.executeAction(action);
          results.push({
            action: action.type,
            target: action.target,
            result: result.status,
            data: result.data,
            duration: result.duration,
            success: result.success
          });
          
          this.logger.info(`✅ Action executed: ${action.type}`, {
            target: action.target,
            result: result.status,
            duration: result.duration
          });
          
          // Emit thinking log
          this.emitThinkingLog('ACT', `Executed ${action.type}: ${result.status} (${result.duration}ms)`);
          
        } catch (error) {
          results.push({
            action: action.type,
            target: action.target,
            result: 'error',
            error: error.message,
            success: false
          });
          
          this.logger.error(`❌ Action failed: ${action.type}`, error);
        } finally {
          this.systemState.activeActions.delete(actionId);
        }
      }
      
      const actionResult = {
        timestamp: Date.now(),
        decision: decision.timestamp,
        results,
        totalActions: decision.actions.length,
        successfulActions: results.filter(r => r.success).length,
        actionTime: Date.now() - actionStart
      };
      
      // Store action result in memory
      this.addToMemory('actions', actionResult);
      
      // Emit action event
      this.emit('brain:action', actionResult);
      this.logger.debug('⚡ Agent actions completed', {
        totalActions: actionResult.totalActions,
        successful: actionResult.successfulActions,
        actionTime: actionResult.actionTime
      });
      
      return actionResult;
      
    } catch (error) {
      this.logger.error('❌ Action execution failed:', error);
      return {
        timestamp: Date.now(),
        decision: decision.timestamp,
        results: [],
        totalActions: 0,
        successfulActions: 0,
        error: error.message
      };
    }
  }
  /**
   * Execute individual actions through system modules
   */
  async executeAction(action) {
    const actionStart = Date.now();
    
    try {
      let result;
      
      switch (action.type) {
        case 'heal_deployment':
          result = await this.healFailedDeployments();
          break;
          
        case 'monitor_queue':
          result = await this.monitorDeploymentQueue();
          break;
          
        case 'handle_critical_error':
          result = await this.handleCriticalErrors();
          break;
          
        case 'analyze_error_patterns':
          result = await this.analyzeErrorPatterns();
          break;
          
        case 'process_nlp_requests':
          result = await this.processNLPRequests();
          break;
          
        case 'process_github_events':
          result = await this.processGitHubEvents();
          break;
          
        case 'optimize_memory':
          result = await this.optimizeMemoryUsage();
          break;
          
        case 'health_check':
          result = await this.performHealthCheck();
          break;
          
        case 'monitor':
          result = await this.performMonitoring();
          break;
          
        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }
      
      return {
        status: 'completed',
        data: result,
        duration: Date.now() - actionStart,
        success: true
      };
      
    } catch (error) {
      return {
        status: 'failed',
        error: error.message,
        duration: Date.now() - actionStart,
        success: false
      };
    }
  }

  /**
   * Heal failed deployments using self-healing system
   */
  async healFailedDeployments() {
    const failedDeployments = Array.from(this.systemState.deployments.values())
      .filter(d => d.status === 'failed');
    
    const healingResults = [];
    
    for (const deployment of failedDeployments) {
      try {
        // Use self-healing agent if available
        if (this.selfHealer && typeof this.selfHealer.healDeployment === 'function') {
          const healingResult = await this.selfHealer.healDeployment(deployment.id);
          healingResults.push({
            deploymentId: deployment.id,
            status: healingResult.success ? 'healed' : 'failed',
            actions: healingResult.actions || ['healing_attempted']
          });
        } else {
          // Fallback to basic retry using deployer
          if (this.deployer && typeof this.deployer.rollback === 'function') {
            await this.deployer.rollback(deployment.id);
            healingResults.push({
              deploymentId: deployment.id,
              status: 'retried',
              actions: ['rollback']
            });
          } else {
            healingResults.push({
              deploymentId: deployment.id,
              status: 'no_healing_available',
              actions: []
            });
          }
        }
      } catch (error) {
        healingResults.push({
          deploymentId: deployment.id,
          status: 'error',
          error: error.message
        });
      }
    }
    
    return {
      processedDeployments: failedDeployments.length,
      healingResults
    };
  }

  /**
   * Monitor deployment queue for bottlenecks
   */
  async monitorDeploymentQueue() {
    try {
      // Use monitor agent if available
      if (this.monitor && typeof this.monitor.getQueueStatus === 'function') {
        const queueStatus = await this.monitor.getQueueStatus();
        
        if (queueStatus.pending > 5) {
          // Scale up processing if possible
          if (typeof this.monitor.scaleProcessing === 'function') {
            await this.monitor.scaleProcessing();
          }
        }
        
        return {
          queueLength: queueStatus.pending,
          processing: queueStatus.processing,
          completed: queueStatus.completed,
          action: queueStatus.pending > 5 ? 'scaled_up' : 'monitored'
        };
      }
      
      // Fallback: basic queue monitoring
      const activeActions = this.systemState.activeActions.size;
      const userInputs = this.systemState.userInputs.length;
      
      return {
        queueLength: userInputs,
        processing: activeActions,
        completed: 0,
        action: 'monitored'
      };
    } catch (error) {
      this.logger.error('Queue monitoring failed:', error.message);
      return {
        queueLength: 0,
        processing: 0,
        completed: 0,
        action: 'error'
      };
    }
  }

  /**
   * Handle critical system errors
   */
  async handleCriticalErrors() {
    const criticalErrors = this.systemState.errors.filter(e => e.severity === 'critical');
    const handledErrors = [];
    
    for (const error of criticalErrors) {
      try {
        // Attempt automated error resolution using analyzer
        if (this.analyzer && typeof this.analyzer.resolveError === 'function') {
          const resolution = await this.analyzer.resolveError(error);
          handledErrors.push({
            errorId: error.id,
            status: 'resolved',
            resolution: resolution.action
          });
        } else {
          // Fallback: log and escalate
          this.logger.error('Critical error requires manual intervention:', error);
          handledErrors.push({
            errorId: error.id,
            status: 'escalated',
            resolution: 'manual_intervention_required'
          });
        }
      } catch (resolutionError) {
        handledErrors.push({
          errorId: error.id,
          status: 'escalated',
          error: resolutionError.message
        });
      }
    }
    
    return {
      criticalErrors: criticalErrors.length,
      handledErrors
    };
  }

  /**
   * Analyze error patterns for insights
   */
  async analyzeErrorPatterns() {
    const recentErrors = this.systemState.errors.filter(
      e => Date.now() - e.timestamp < 3600000 // Last hour
    );
    
    const patterns = this.identifyErrorPatterns(recentErrors);
    
    return {
      totalErrors: recentErrors.length,
      patterns,
      recommendations: this.generateErrorRecommendations(patterns)
    };
  }

  /**
   * Process pending NLP requests
   */
  async processNLPRequests() {
    const nlpInputs = this.systemState.userInputs.filter(
      i => i.type === 'nlp_deployment_request' && !i.processed
    );
    
    const processedRequests = [];
    
    for (const input of nlpInputs.slice(0, 3)) { // Process up to 3 at a time
      try {
        // Use planner to create and execute deployment plan
        if (this.planner) {
          const plan = await this.planner.plan(input.parsedConfig);
          const deploymentResult = await this.planner.executePlan(plan, {
            name: input.parsedConfig.name,
            repository: input.context.repository,
            environment: input.context.environment || 'production'
          });
          
          processedRequests.push({
            inputId: input.id || Date.now(),
            status: 'deployed',
            planId: plan.id,
            deploymentId: deploymentResult.deploymentId,
            response: 'deployment_initiated'
          });
        } else {
          // Fallback processing
          processedRequests.push({
            inputId: input.id || Date.now(),
            status: 'processed',
            response: 'nlp_parsed'
          });
        }
        
        input.processed = true;
        
      } catch (error) {
        processedRequests.push({
          inputId: input.id || Date.now(),
          status: 'error',
          error: error.message
        });
      }
    }
    
    return {
      pendingRequests: nlpInputs.length,
      processedRequests
    };
  }

  /**
   * Process GitHub webhook events
   */
  async processGitHubEvents() {
    const githubEvents = this.systemState.userInputs.filter(
      i => i.type === 'github' && !i.processed
    );
    
    const processedEvents = [];
    
    for (const event of githubEvents.slice(0, 5)) { // Process up to 5 at a time
      try {
        // Process through GitHub webhook handler if available
        if (this.planner && typeof this.planner.processGitHubEvent === 'function') {
          const result = await this.planner.processGitHubEvent(event.data);
          processedEvents.push({
            eventId: event.id,
            status: 'processed',
            result: result.status
          });
        } else {
          // Fallback: basic event processing
          processedEvents.push({
            eventId: event.id,
            status: 'acknowledged',
            result: 'basic_processing'
          });
        }
        
        event.processed = true;
        
      } catch (error) {
        processedEvents.push({
          eventId: event.id,
          status: 'error',
          error: error.message
        });
      }
    }
    
    return {
      pendingEvents: githubEvents.length,
      processedEvents
    };
  }

  /**
   * Optimize memory usage
   */
  async optimizeMemoryUsage() {
    const beforeMemory = process.memoryUsage();
    
    // Clean up old memory entries
    this.cleanupMemory();
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    const afterMemory = process.memoryUsage();
    
    return {
      beforeMemory: beforeMemory.heapUsed,
      afterMemory: afterMemory.heapUsed,
      freed: beforeMemory.heapUsed - afterMemory.heapUsed,
      percentage: ((beforeMemory.heapUsed - afterMemory.heapUsed) / beforeMemory.heapUsed) * 100
    };
  }

  /**
   * Perform system health check
   */
  async performHealthCheck() {
    const healthChecks = {
      planner: await this.checkPlannerHealth(),
      deployer: await this.checkDeployerHealth(),
      analyzer: await this.checkAnalyzerHealth(),
      monitor: await this.checkMonitorHealth(),
      nlpParser: await this.checkNLPHealth(),
      memory: this.checkMemoryHealth(),
      activeActions: this.systemState.activeActions.size
    };
    
    const overallHealth = Object.values(healthChecks).every(check => 
      typeof check === 'object' ? check.status === 'healthy' : check === 'healthy'
    );
    
    return {
      overall: overallHealth ? 'healthy' : 'degraded',
      components: healthChecks,
      timestamp: Date.now()
    };
  }

  /**
   * Perform general monitoring
   */
  async performMonitoring() {
    return {
      activeDeployments: this.systemState.deployments.size,
      recentErrors: this.systemState.errors.filter(e => Date.now() - e.timestamp < 300000).length,
      memoryUsage: process.memoryUsage().heapUsed,
      uptime: process.uptime(),
      lastActivity: this.getLastActivityTime()
    };
  }
  /**
   * REFLECT: Learn from results and update memory
   */
  async reflect(cycle) {
    const reflectionStart = Date.now();
    
    try {
      const reflection = {
        timestamp: Date.now(),
        cycle: {
          observation: cycle.observation.timestamp,
          thought: cycle.thought.timestamp,
          decision: cycle.decision.timestamp,
          result: cycle.result.timestamp
        },
        performance: {
          cycleTime: cycle.cycleTime,
          thinkingTime: cycle.thought.thinkingTime,
          decisionTime: cycle.decision.decisionTime,
          actionTime: cycle.result.actionTime,
          totalTime: Date.now() - cycle.observation.timestamp
        },
        outcomes: {
          actionsPlanned: cycle.decision.actions.length,
          actionsExecuted: cycle.result.totalActions,
          actionsSuccessful: cycle.result.successfulActions,
          successRate: cycle.result.totalActions > 0 ? 
            (cycle.result.successfulActions / cycle.result.totalActions) * 100 : 0
        },
        learning: this.extractLearning(cycle),
        improvements: this.identifyImprovements(cycle),
        reflectionTime: Date.now() - reflectionStart
      };
      
      // Store reflection in memory
      this.addToMemory('reflections', reflection);
      
      // Update persistent memory with learning
      await this.updatePersistentMemory(cycle, reflection);
      
      // Update system state based on learning
      await this.applyLearning(reflection.learning);
      
      // Emit thinking log
      this.emitThinkingLog('REFLECT', `Cycle complete: ${reflection.outcomes.successRate.toFixed(0)}% success, ${reflection.learning.length} insights learned`);
      
      // Emit reflection event
      this.emit('brain:reflection', reflection);
      this.logger.debug('🔄 Agent reflection completed', {
        cycleTime: reflection.performance.cycleTime,
        successRate: reflection.outcomes.successRate,
        learningPoints: reflection.learning.length,
        reflectionTime: reflection.reflectionTime
      });
      
      return reflection;
      
    } catch (error) {
      this.logger.error('❌ Reflection failed:', error);
      return {
        timestamp: Date.now(),
        error: error.message,
        performance: { cycleTime: cycle.cycleTime },
        outcomes: { successRate: 0 },
        learning: [],
        improvements: []
      };
    }
  }

  /**
   * Extract learning from cycle results
   */
  extractLearning(cycle) {
    const learning = [];
    
    // Learn from successful actions
    const successfulActions = cycle.result.results.filter(r => r.success);
    if (successfulActions.length > 0) {
      learning.push({
        type: 'success_pattern',
        insight: `Actions ${successfulActions.map(a => a.action).join(', ')} were successful`,
        confidence: 0.8,
        applicability: 'future_similar_situations'
      });
    }
    
    // Learn from failed actions
    const failedActions = cycle.result.results.filter(r => !r.success);
    if (failedActions.length > 0) {
      learning.push({
        type: 'failure_pattern',
        insight: `Actions ${failedActions.map(a => a.action).join(', ')} failed`,
        confidence: 0.9,
        applicability: 'avoid_in_similar_situations'
      });
    }
    
    // Learn from reasoning accuracy
    if (cycle.thought.confidence > 0.8 && cycle.result.successfulActions > 0) {
      learning.push({
        type: 'reasoning_accuracy',
        insight: 'High confidence reasoning led to successful actions',
        confidence: 0.7,
        applicability: 'trust_high_confidence_reasoning'
      });
    }
    
    // Learn from timing patterns
    if (cycle.performance && cycle.performance.cycleTime > 10000) { // > 10 seconds
      learning.push({
        type: 'performance_issue',
        insight: 'Cycle took longer than expected, may need optimization',
        confidence: 0.6,
        applicability: 'optimize_slow_operations'
      });
    }
    
    return learning;
  }

  /**
   * Identify improvements for future cycles
   */
  identifyImprovements(cycle) {
    const improvements = [];
    
    // Improve observation efficiency
    if (cycle.observation.deployments.length === 0 && cycle.observation.errors.length === 0) {
      improvements.push({
        area: 'observation',
        suggestion: 'Reduce observation frequency during quiet periods',
        priority: 'low'
      });
    }
    
    // Improve decision making
    if (cycle.decision.actions.length > cycle.result.totalActions) {
      improvements.push({
        area: 'decision',
        suggestion: 'Better action prioritization to avoid queue overflow',
        priority: 'medium'
      });
    }
    
    // Improve action execution
    if (cycle.result.successfulActions < cycle.result.totalActions * 0.8) {
      improvements.push({
        area: 'action',
        suggestion: 'Improve error handling and retry mechanisms',
        priority: 'high'
      });
    }
    
    return improvements;
  }

  /**
   * Apply learning to improve future performance
   */
  async applyLearning(learning) {
    for (const insight of learning) {
      switch (insight.type) {
        case 'success_pattern':
          // Increase priority of successful action types
          this.adjustActionPriorities(insight, 'increase');
          break;
          
        case 'failure_pattern':
          // Decrease priority of failed action types
          this.adjustActionPriorities(insight, 'decrease');
          break;
          
        case 'performance_issue':
          // Adjust timing parameters
          if (insight.insight.includes('cycle took longer')) {
            this.loopInterval = Math.min(this.loopInterval * 1.1, 10000);
          }
          break;
      }
    }
  }

  // Helper methods for memory management and utilities
  
  /**
   * Add entry to memory with size management
   */
  addToMemory(type, entry) {
    if (!this.memory[type]) {
      this.memory[type] = [];
    }
    
    this.memory[type].push(entry);
    
    // Maintain memory size limits
    if (this.memory[type].length > this.maxMemorySize / Object.keys(this.memory).length) {
      this.memory[type] = this.memory[type].slice(-Math.floor(this.maxMemorySize / Object.keys(this.memory).length));
    }
  }

  /**
   * Clean up old memory entries
   */
  cleanupMemory() {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    
    for (const [type, entries] of Object.entries(this.memory)) {
      this.memory[type] = entries.filter(entry => entry.timestamp > cutoffTime);
    }
  }

  /**
   * Get recent activity summary
   */
  getRecentActivity() {
    const recentTime = Date.now() - (60 * 60 * 1000); // Last hour
    
    return {
      observations: this.memory.observations.filter(o => o.timestamp > recentTime).length,
      thoughts: this.memory.thoughts.filter(t => t.timestamp > recentTime).length,
      decisions: this.memory.decisions.filter(d => d.timestamp > recentTime).length,
      actions: this.memory.actions.filter(a => a.timestamp > recentTime).length
    };
  }

  /**
   * Analyze trends in system behavior
   */
  analyzeTrends() {
    const recentReflections = this.memory.reflections.slice(-10);
    
    if (recentReflections.length < 3) {
      return { trend: 'insufficient_data' };
    }
    
    const avgSuccessRate = recentReflections.reduce((sum, r) => sum + r.outcomes.successRate, 0) / recentReflections.length;
    const avgCycleTime = recentReflections.reduce((sum, r) => sum + r.performance.cycleTime, 0) / recentReflections.length;
    
    return {
      successRate: {
        average: avgSuccessRate,
        trend: this.calculateTrend(recentReflections.map(r => r.outcomes.successRate))
      },
      cycleTime: {
        average: avgCycleTime,
        trend: this.calculateTrend(recentReflections.map(r => r.performance.cycleTime))
      }
    };
  }

  /**
   * Calculate trend direction
   */
  calculateTrend(values) {
    if (values.length < 3) return 'stable';
    
    const recent = values.slice(-3);
    const earlier = values.slice(-6, -3);
    
    if (earlier.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((sum, v) => sum + v, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, v) => sum + v, 0) / earlier.length;
    
    const change = ((recentAvg - earlierAvg) / earlierAvg) * 100;
    
    if (change > 5) return 'improving';
    if (change < -5) return 'declining';
    return 'stable';
  }

  // Utility methods
  
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getRecentLogErrors() {
    // Placeholder - would integrate with actual logging system
    return [];
  }

  async getDeploymentErrors() {
    // Placeholder - would get errors from deployment system
    return [];
  }

  deduplicateErrors(errors) {
    const seen = new Set();
    return errors.filter(error => {
      const key = `${error.message}_${error.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async getNLPInputs() {
    // Placeholder - would get from NLP input queue
    return [];
  }

  async getGitHubEvents() {
    // Placeholder - would get from GitHub webhook queue
    return [];
  }

  async getAPIRequests() {
    // Placeholder - would get from API request logs
    return [];
  }

  identifyErrorPatterns(errors) {
    // Placeholder - would analyze error patterns
    return [];
  }

  generateErrorRecommendations(patterns) {
    // Placeholder - would generate recommendations
    return [];
  }

  async checkPlannerHealth() {
    return this.planner ? { status: 'healthy' } : { status: 'missing' };
  }

  async checkDeployerHealth() {
    return this.deployer ? { status: 'healthy' } : { status: 'missing' };
  }

  async checkAnalyzerHealth() {
    return this.analyzer ? { status: 'healthy' } : { status: 'missing' };
  }

  async checkMonitorHealth() {
    return this.monitor ? { status: 'healthy' } : { status: 'missing' };
  }

  async checkNLPHealth() {
    return { status: 'healthy' };
  }

  checkMemoryHealth() {
    const usage = process.memoryUsage();
    const percentage = (usage.heapUsed / usage.heapTotal) * 100;
    return {
      status: percentage > 90 ? 'critical' : percentage > 70 ? 'warning' : 'healthy',
      percentage
    };
  }

  getLastActivityTime() {
    const lastEntries = [
      ...this.memory.observations.slice(-1),
      ...this.memory.thoughts.slice(-1),
      ...this.memory.decisions.slice(-1),
      ...this.memory.actions.slice(-1)
    ];
    
    return lastEntries.length > 0 ? Math.max(...lastEntries.map(e => e.timestamp)) : Date.now();
  }

  adjustActionPriorities(insight, direction) {
    // Placeholder - would adjust internal action priority weights
    this.logger.debug(`Adjusting action priorities based on learning: ${insight.insight}`);
  }

  /**
   * Update persistent memory with cycle results
   */
  async updatePersistentMemory(cycle, reflection) {
    if (!this.persistentMemory) return;

    try {
      // Extract deployment information from cycle
      const deploymentInfo = this.extractDeploymentInfo(cycle);
      
      if (deploymentInfo.repoId) {
        const memoryUpdate = {
          deployment: {
            success: reflection.outcomes.successRate > 0.5,
            timestamp: Date.now(),
            cycleTime: reflection.performance.cycleTime,
            actions: cycle.result.results.map(r => r.action)
          }
        };

        // Add errors if any
        if (reflection.outcomes.successRate < 1.0) {
          memoryUpdate.errors = cycle.result.results
            .filter(r => !r.success)
            .map(r => ({
              message: `Action ${r.action} failed`,
              type: 'action_failure'
            }));
        }

        // Add fixes if any
        if (reflection.learning.length > 0) {
          memoryUpdate.fixes = reflection.learning
            .filter(l => l.type === 'success_pattern')
            .map(l => ({
              description: l.insight,
              effective: true
            }));
        }

        // Update persistent memory
        this.persistentMemory.updateMemory(deploymentInfo.repoId, memoryUpdate);
      }
    } catch (error) {
      this.logger.warn('Failed to update persistent memory:', error.message);
    }
  }

  /**
   * Extract deployment information from cycle
   */
  extractDeploymentInfo(cycle) {
    // Try to extract repo information from observations or decisions
    let repoId = null;
    
    // Look for deployment-related actions
    const deploymentActions = cycle.result.results.filter(r => 
      r.action.includes('deploy') || r.action.includes('heal')
    );
    
    if (deploymentActions.length > 0) {
      repoId = `deployment_${Date.now()}`;
    }

    return { repoId };
  }

  /**
   * Emit thinking log for real-time dashboard
   */
  emitThinkingLog(type, message, data = null) {
    const logEntry = {
      type,
      message,
      data,
      timestamp: Date.now()
    };
    
    // Emit to brain event system
    this.emit('brain:thinking_log', logEntry);
    
    // If we have access to the global log system, use it
    if (global.addAgentLog) {
      global.addAgentLog(type, message, data);
    }
  }
}

export { AgentBrain };