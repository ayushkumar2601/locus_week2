/**
 * Agent Thinking Panel - Real-time display of agent reasoning logs
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { ScrollArea } from '../ui/scroll-area';
import { 
  Brain, 
  Eye, 
  Lightbulb, 
  Target, 
  Zap, 
  RotateCcw,
  AlertCircle,
  Trash2,
  Play,
  Pause
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';

interface AgentLogEntry {
  id: string;
  timestamp: number;
  type: 'THINK' | 'DECIDE' | 'ACT' | 'ERROR' | 'OBSERVE' | 'REFLECT';
  message: string;
  data?: any;
  level: 'info' | 'warn' | 'error' | 'success';
}

const LOG_TYPE_CONFIG = {
  OBSERVE: { 
    icon: Eye, 
    color: 'text-blue-500', 
    bgColor: 'bg-blue-50 dark:bg-blue-950',
    label: 'OBSERVE'
  },
  THINK: { 
    icon: Lightbulb, 
    color: 'text-yellow-500', 
    bgColor: 'bg-yellow-50 dark:bg-yellow-950',
    label: 'THINK'
  },
  DECIDE: { 
    icon: Target, 
    color: 'text-green-500', 
    bgColor: 'bg-green-50 dark:bg-green-950',
    label: 'DECIDE'
  },
  ACT: { 
    icon: Zap, 
    color: 'text-purple-500', 
    bgColor: 'bg-purple-50 dark:bg-purple-950',
    label: 'ACT'
  },
  REFLECT: { 
    icon: RotateCcw, 
    color: 'text-orange-500', 
    bgColor: 'bg-orange-50 dark:bg-orange-950',
    label: 'REFLECT'
  },
  ERROR: { 
    icon: AlertCircle, 
    color: 'text-red-500', 
    bgColor: 'bg-red-50 dark:bg-red-950',
    label: 'ERROR'
  }
};

export function AgentThinkingPanel() {
  const [logs, setLogs] = useState<AgentLogEntry[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState({
    total: 0,
    byType: {} as Record<string, number>,
    recentActivity: 0
  });

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!isVisible) return;

    const newSocket = io('/agent-logs', {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Connected to agent logs');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from agent logs');
      setIsConnected(false);
    });

    newSocket.on('logs:history', (historyLogs: AgentLogEntry[]) => {
      setLogs(historyLogs);
    });

    newSocket.on('logs:new', (newLog: AgentLogEntry) => {
      if (!isPaused) {
        setLogs(prev => [newLog, ...prev.slice(0, 199)]); // Keep only 200 logs
      }
    });

    newSocket.on('logs:cleared', () => {
      setLogs([]);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [isVisible, isPaused]);

  // Fetch initial logs and stats
  useEffect(() => {
    if (isVisible) {
      fetchLogs();
      fetchStats();
    }
  }, [isVisible]);

  // Auto-scroll to top when new logs arrive
  useEffect(() => {
    if (scrollAreaRef.current && !isPaused) {
      scrollAreaRef.current.scrollTop = 0;
    }
  }, [logs, isPaused]);

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/agent/logs?limit=100');
      const data = await response.json();
      if (data.success) {
        setLogs(data.data.logs);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/agent/logs/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const clearLogs = async () => {
    try {
      await fetch('/api/agent/logs', { method: 'DELETE' });
      setLogs([]);
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  };

  const addTestLogs = async () => {
    try {
      await fetch('/api/agent/logs/test', { method: 'POST' });
    } catch (error) {
      console.error('Failed to add test logs:', error);
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatMessage = (log: AgentLogEntry) => {
    const config = LOG_TYPE_CONFIG[log.type];
    return `${config.label} → ${log.message}`;
  };

  if (!isVisible) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-gray-400" />
              <span className="text-gray-400">Agent Thinking</span>
            </CardTitle>
            <Switch
              checked={isVisible}
              onCheckedChange={setIsVisible}
              aria-label="Show Agent Thinking"
            />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Enable to see real-time AI reasoning and decision making
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900 text-gray-100 border-gray-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-blue-400" />
            <CardTitle className="text-white">🧠 Agent Thinking</CardTitle>
            <Badge 
              variant={isConnected ? "default" : "secondary"}
              className={isConnected ? "bg-green-600" : "bg-gray-600"}
            >
              {isConnected ? "Live" : "Offline"}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPaused(!isPaused)}
              className="text-gray-300 hover:text-white"
            >
              {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={clearLogs}
              className="text-gray-300 hover:text-white"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            
            <Switch
              checked={isVisible}
              onCheckedChange={setIsVisible}
              aria-label="Show Agent Thinking"
            />
          </div>
        </div>
        
        <CardDescription className="text-gray-400">
          Real-time AI reasoning and decision making • {logs.length} entries
          {isPaused && <span className="text-yellow-400 ml-2">(Paused)</span>}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className="h-96" ref={scrollAreaRef}>
          <div className="p-4 space-y-2">
            {logs.length === 0 ? (
              <div className="text-center py-8">
                <Brain className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">No agent activity yet</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addTestLogs}
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Add Test Logs
                </Button>
              </div>
            ) : (
              logs.map((log) => {
                const config = LOG_TYPE_CONFIG[log.type];
                const Icon = config.icon;
                
                return (
                  <div
                    key={log.id}
                    className={`flex items-start space-x-3 p-3 rounded-lg font-mono text-sm ${config.bgColor} border border-gray-700`}
                  >
                    <div className="flex items-center space-x-2 min-w-0 flex-shrink-0">
                      <span className="text-xs text-gray-400 font-mono">
                        [{formatTime(log.timestamp)}]
                      </span>
                      <Icon className={`h-4 w-4 ${config.color} flex-shrink-0`} />
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <span className={`font-semibold ${config.color}`}>
                        {config.label}
                      </span>
                      <span className="text-gray-200 ml-2">→</span>
                      <span className="text-gray-100 ml-2">
                        {log.message}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
        
        {/* Stats Footer */}
        <div className="border-t border-gray-700 p-3">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex space-x-4">
              {Object.entries(stats.byType).map(([type, count]) => {
                const config = LOG_TYPE_CONFIG[type as keyof typeof LOG_TYPE_CONFIG];
                if (!config) return null;
                
                return (
                  <div key={type} className="flex items-center space-x-1">
                    <div className={`w-2 h-2 rounded-full ${config.color.replace('text-', 'bg-')}`} />
                    <span>{type}: {count}</span>
                  </div>
                );
              })}
            </div>
            
            <div>
              Recent: {stats.recentActivity} • Total: {stats.total}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}