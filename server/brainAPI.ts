/**
 * Agent Brain API - REST endpoints for brain monitoring and control
 */

import express from 'express';
import { AgentOrchestrator } from '../agent/index.js';

const router = express.Router();

// Global brain instance (will be initialized by main server)
let orchestrator: AgentOrchestrator | null = null;

export function initializeBrainAPI(agentOrchestrator: AgentOrchestrator) {
  orchestrator = agentOrchestrator;
}

/**
 * GET /api/brain/status
 * Get current brain status and metrics
 */
router.get('/status', (req, res) => {
  try {
    if (!orchestrator || !orchestrator.brain) {
      return res.status(404).json({
        error: 'Agent Brain not available',
        enabled: false
      });
    }

    const status = orchestrator.getBrainStatus();
    
    res.json({
      success: true,
      data: {
        ...status,
        timestamp: Date.now(),
        version: '1.0.0'
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get brain status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/brain/start
 * Start the Agent Brain cognitive loop
 */
router.post('/start', async (req, res) => {
  try {
    if (!orchestrator || !orchestrator.brain) {
      return res.status(404).json({
        error: 'Agent Brain not available'
      });
    }

    if (orchestrator.brain.isRunning) {
      return res.status(400).json({
        error: 'Agent Brain is already running'
      });
    }

    await orchestrator.startBrain();
    
    res.json({
      success: true,
      message: 'Agent Brain started successfully',
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to start Agent Brain',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/brain/stop
 * Stop the Agent Brain cognitive loop
 */
router.post('/stop', async (req, res) => {
  try {
    if (!orchestrator || !orchestrator.brain) {
      return res.status(404).json({
        error: 'Agent Brain not available'
      });
    }

    if (!orchestrator.brain.isRunning) {
      return res.status(400).json({
        error: 'Agent Brain is not running'
      });
    }

    await orchestrator.stopBrain();
    
    res.json({
      success: true,
      message: 'Agent Brain stopped successfully',
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to stop Agent Brain',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/brain/memory
 * Get brain memory contents and statistics
 */
router.get('/memory', (req, res) => {
  try {
    if (!orchestrator || !orchestrator.brain) {
      return res.status(404).json({
        error: 'Agent Brain not available'
      });
    }

    const brain = orchestrator.brain;
    const memoryStats = {
      observations: brain.memory.observations.length,
      thoughts: brain.memory.thoughts.length,
      decisions: brain.memory.decisions.length,
      actions: brain.memory.actions.length,
      reflections: brain.memory.reflections.length,
      totalEntries: Object.values(brain.memory).reduce((sum, arr) => sum + arr.length, 0),
      maxSize: brain.memory.maxMemorySize
    };

    // Get recent entries (last 10 of each type)
    const recentMemory = {
      observations: brain.memory.observations.slice(-10),
      thoughts: brain.memory.thoughts.slice(-10),
      decisions: brain.memory.decisions.slice(-10),
      actions: brain.memory.actions.slice(-10),
      reflections: brain.memory.reflections.slice(-10)
    };

    res.json({
      success: true,
      data: {
        statistics: memoryStats,
        recent: recentMemory,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get brain memory',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/brain/system-state
 * Get current system state as observed by the brain
 */
router.get('/system-state', (req, res) => {
  try {
    if (!orchestrator || !orchestrator.brain) {
      return res.status(404).json({
        error: 'Agent Brain not available'
      });
    }

    const brain = orchestrator.brain;
    const systemState = {
      deployments: Array.from(brain.systemState.deployments.entries()).map(([id, deployment]) => ({
        id,
        ...deployment
      })),
      errors: brain.systemState.errors.slice(-20), // Last 20 errors
      userInputs: brain.systemState.userInputs.slice(-20), // Last 20 inputs
      activeActions: Array.from(brain.systemState.activeActions),
      lastObservation: brain.systemState.lastObservation
    };

    res.json({
      success: true,
      data: {
        ...systemState,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get system state',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/brain/simulate-input
 * Simulate user input for testing brain responses
 */
router.post('/simulate-input', (req, res) => {
  try {
    if (!orchestrator || !orchestrator.brain) {
      return res.status(404).json({
        error: 'Agent Brain not available'
      });
    }

    const { type, message, data } = req.body;

    if (!type || !message) {
      return res.status(400).json({
        error: 'Missing required fields: type and message'
      });
    }

    const brain = orchestrator.brain;
    const simulatedInput = {
      id: `sim_${Date.now()}`,
      type,
      message,
      data: data || {},
      timestamp: Date.now(),
      processed: false
    };

    brain.systemState.userInputs.push(simulatedInput);

    res.json({
      success: true,
      message: 'Input simulated successfully',
      data: simulatedInput
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to simulate input',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/brain/health
 * Health check endpoint for brain API
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Agent Brain API is healthy',
    timestamp: Date.now(),
    version: '1.0.0'
  });
});

export default router;