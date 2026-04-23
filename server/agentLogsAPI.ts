/**
 * Agent Logs API - Real-time thinking logs for frontend dashboard
 */

import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';

const router = express.Router();

// In-memory log storage (last 200 entries)
let agentLogs: AgentLogEntry[] = [];
const MAX_LOGS = 200;

interface AgentLogEntry {
  id: string;
  timestamp: number;
  type: 'THINK' | 'DECIDE' | 'ACT' | 'ERROR' | 'OBSERVE' | 'REFLECT';
  message: string;
  data?: any;
  level: 'info' | 'warn' | 'error' | 'success';
}

// Socket.IO instance (will be initialized by main server)
let io: SocketIOServer | null = null;

export function initializeAgentLogs(socketServer: SocketIOServer) {
  io = socketServer;
  
  // Set up socket namespace for agent logs
  const agentNamespace = io.of('/agent-logs');
  
  agentNamespace.on('connection', (socket) => {
    console.log('Client connected to agent logs');
    
    // Send existing logs to new client
    socket.emit('logs:history', agentLogs);
    
    socket.on('disconnect', () => {
      console.log('Client disconnected from agent logs');
    });
  });
}

/**
 * Add a new log entry
 */
export function addAgentLog(type: AgentLogEntry['type'], message: string, data?: any) {
  const logEntry: AgentLogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    type,
    message,
    data,
    level: getLogLevel(type)
  };

  // Add to memory (keep only last MAX_LOGS)
  agentLogs.unshift(logEntry);
  if (agentLogs.length > MAX_LOGS) {
    agentLogs = agentLogs.slice(0, MAX_LOGS);
  }

  // Broadcast to connected clients
  if (io) {
    io.of('/agent-logs').emit('logs:new', logEntry);
  }

  return logEntry;
}

/**
 * Get log level based on type
 */
function getLogLevel(type: AgentLogEntry['type']): AgentLogEntry['level'] {
  switch (type) {
    case 'ERROR':
      return 'error';
    case 'THINK':
      return 'info';
    case 'DECIDE':
      return 'warn';
    case 'ACT':
      return 'success';
    case 'OBSERVE':
      return 'info';
    case 'REFLECT':
      return 'info';
    default:
      return 'info';
  }
}

/**
 * GET /api/agent/logs
 * Get recent agent logs
 */
router.get('/logs', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;
  
  const logs = agentLogs.slice(offset, offset + limit);
  
  res.json({
    success: true,
    data: {
      logs,
      total: agentLogs.length,
      limit,
      offset
    }
  });
});

/**
 * GET /api/agent/logs/stats
 * Get log statistics
 */
router.get('/logs/stats', (req, res) => {
  const stats = {
    total: agentLogs.length,
    byType: agentLogs.reduce((acc, log) => {
      acc[log.type] = (acc[log.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    byLevel: agentLogs.reduce((acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    recentActivity: agentLogs.filter(log => 
      Date.now() - log.timestamp < 5 * 60 * 1000 // Last 5 minutes
    ).length
  };

  res.json({
    success: true,
    data: stats
  });
});

/**
 * DELETE /api/agent/logs
 * Clear all logs
 */
router.delete('/logs', (req, res) => {
  agentLogs = [];
  
  // Broadcast clear event
  if (io) {
    io.of('/agent-logs').emit('logs:cleared');
  }
  
  res.json({
    success: true,
    message: 'Agent logs cleared'
  });
});

/**
 * POST /api/agent/logs/test
 * Add test log entries for development
 */
router.post('/logs/test', (req, res) => {
  const testLogs = [
    { type: 'OBSERVE' as const, message: 'Scanning system state for new deployments' },
    { type: 'THINK' as const, message: 'Detected Express.js application with MongoDB dependency' },
    { type: 'DECIDE' as const, message: 'Provision MongoDB Atlas cluster and configure connection' },
    { type: 'ACT' as const, message: 'Deploying service to production environment' },
    { type: 'REFLECT' as const, message: 'Deployment successful, updating success patterns' }
  ];

  testLogs.forEach((log, index) => {
    setTimeout(() => {
      addAgentLog(log.type, log.message);
    }, index * 1000);
  });

  res.json({
    success: true,
    message: 'Test logs added'
  });
});

export default router;