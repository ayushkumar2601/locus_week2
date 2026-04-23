/**
 * Agent Brain Dashboard - Real-time monitoring and control interface
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Progress } from '../ui/progress';
import { AgentThinkingPanel } from './AgentThinkingPanel';
import { 
  Brain, 
  Play, 
  Pause, 
  Activity, 
  Eye, 
  Lightbulb, 
  Target, 
  Zap, 
  RotateCcw,
  Database,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface BrainStatus {
  enabled: boolean;
  running: boolean;
  memory: {
    observations: number;
    thoughts: number;
    decisions: number;
    actions: number;
    reflections: number;
  };
  systemState: {
    deployments: number;
    errors: number;
    activeActions: number;
  };
}

interface MemoryEntry {
  timestamp: number;
  [key: string]: any;
}

interface BrainMemory {
  statistics: {
    observations: number;
    thoughts: number;
    decisions: number;
    actions: number;
    reflections: number;
    totalEntries: number;
    maxSize: number;
  };
  recent: {
    observations: MemoryEntry[];
    thoughts: MemoryEntry[];
    decisions: MemoryEntry[];
    actions: MemoryEntry[];
    reflections: MemoryEntry[];
  };
}

export function BrainDashboard() {
  const [status, setStatus] = useState<BrainStatus | null>(null);
  const [memory, setMemory] = useState<BrainMemory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch brain status
  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/brain/status');
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.data);
      } else {
        setError(data.error || 'Failed to fetch brain status');
      }
    } catch (err) {
      setError('Network error fetching brain status');
    }
  };

  // Fetch brain memory
  const fetchMemory = async () => {
    try {
      const response = await fetch('/api/brain/memory');
      const data = await response.json();
      
      if (data.success) {
        setMemory(data.data);
      }
    } catch (err) {
      console.warn('Failed to fetch brain memory:', err);
    }
  };

  // Start brain
  const startBrain = async () => {
    try {
      const response = await fetch('/api/brain/start', { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        await fetchStatus();
      } else {
        setError(data.error || 'Failed to start brain');
      }
    } catch (err) {
      setError('Network error starting brain');
    }
  };

  // Stop brain
  const stopBrain = async () => {
    try {
      const response = await fetch('/api/brain/stop', { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        await fetchStatus();
      } else {
        setError(data.error || 'Failed to stop brain');
      }
    } catch (err) {
      setError('Network error stopping brain');
    }
  };

  // Simulate input for testing
  const simulateInput = async (type: string, message: string) => {
    try {
      await fetch('/api/brain/simulate-input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, message })
      });
    } catch (err) {
      console.warn('Failed to simulate input:', err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchStatus();
      await fetchMemory();
      setLoading(false);
    };

    loadData();

    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      fetchStatus();
      fetchMemory();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <Brain className="h-6 w-6 animate-pulse" />
          <span>Loading Agent Brain...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>Agent Brain Error</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Agent Brain Not Available</CardTitle>
          <CardDescription>
            The Agent Brain system is not currently available.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const memoryUsage = memory ? 
    (memory.statistics.totalEntries / memory.statistics.maxSize) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Brain className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">Agent Brain Dashboard</h1>
            <div className="flex items-center space-x-2">
              <p className="text-gray-600">Central Intelligence System Monitoring</p>
              <Badge variant="outline" className="text-xs">
                🤖 Groq AI Powered
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Demo Mode
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant={status.running ? "default" : "secondary"}>
            {status.running ? "Running" : "Stopped"}
          </Badge>
          
          {status.running ? (
            <Button onClick={stopBrain} variant="outline" size="sm">
              <Pause className="h-4 w-4 mr-2" />
              Stop
            </Button>
          ) : (
            <Button onClick={startBrain} size="sm">
              <Play className="h-4 w-4 mr-2" />
              Start
            </Button>
          )}
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            {status.running ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-gray-400" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status.running ? "Active" : "Inactive"}
            </div>
            <p className="text-xs text-muted-foreground">
              Cognitive loop {status.running ? "running" : "stopped"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Deployments</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status.systemState.deployments}</div>
            <p className="text-xs text-muted-foreground">
              Currently monitored
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Actions</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status.systemState.activeActions}</div>
            <p className="text-xs text-muted-foreground">
              Currently executing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Errors</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status.systemState.errors}</div>
            <p className="text-xs text-muted-foreground">
              Detected issues
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cognitive Cycle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <RotateCcw className="h-5 w-5" />
            <span>Cognitive Cycle</span>
            <Badge variant="outline" className="text-xs ml-2">
              AI-Powered
            </Badge>
          </CardTitle>
          <CardDescription>
            The continuous observe → think → decide → act → reflect loop powered by Groq AI
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="flex flex-col items-center space-y-2">
              <Eye className="h-8 w-8 text-blue-600" />
              <div className="text-center">
                <div className="font-semibold">Observe</div>
                <div className="text-sm text-gray-600">
                  {status.memory.observations} observations
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-center space-y-2">
              <Lightbulb className="h-8 w-8 text-yellow-600" />
              <div className="text-center">
                <div className="font-semibold">Think</div>
                <div className="text-sm text-gray-600">
                  {status.memory.thoughts} thoughts
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-center space-y-2">
              <Target className="h-8 w-8 text-green-600" />
              <div className="text-center">
                <div className="font-semibold">Decide</div>
                <div className="text-sm text-gray-600">
                  {status.memory.decisions} decisions
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-center space-y-2">
              <Zap className="h-8 w-8 text-purple-600" />
              <div className="text-center">
                <div className="font-semibold">Act</div>
                <div className="text-sm text-gray-600">
                  {status.memory.actions} actions
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-center space-y-2">
              <RotateCcw className="h-8 w-8 text-orange-600" />
              <div className="text-center">
                <div className="font-semibold">Reflect</div>
                <div className="text-sm text-gray-600">
                  {status.memory.reflections} reflections
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Memory Usage */}
      {memory && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>Memory Usage</span>
            </CardTitle>
            <CardDescription>
              Brain memory utilization and statistics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Memory Usage</span>
                <span>{memory.statistics.totalEntries} / {memory.statistics.maxSize}</span>
              </div>
              <Progress value={memoryUsage} className="h-2" />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div>
                <div className="font-medium">Observations</div>
                <div className="text-gray-600">{memory.statistics.observations}</div>
              </div>
              <div>
                <div className="font-medium">Thoughts</div>
                <div className="text-gray-600">{memory.statistics.thoughts}</div>
              </div>
              <div>
                <div className="font-medium">Decisions</div>
                <div className="text-gray-600">{memory.statistics.decisions}</div>
              </div>
              <div>
                <div className="font-medium">Actions</div>
                <div className="text-gray-600">{memory.statistics.actions}</div>
              </div>
              <div>
                <div className="font-medium">Reflections</div>
                <div className="text-gray-600">{memory.statistics.reflections}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agent Thinking Panel */}
      <AgentThinkingPanel />

      {/* Testing Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>Demo Controls</span>
            <Badge variant="secondary" className="text-xs">
              Professional Demo
            </Badge>
          </CardTitle>
          <CardDescription>
            Simulate system events to demonstrate AI-powered autonomous responses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => simulateInput('nlp', 'Deploy a MERN app with authentication')}
            >
              🚀 Simulate Deployment Request
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => simulateInput('github', 'Push event from repository')}
            >
              📦 Simulate GitHub Event
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => simulateInput('error', 'Critical deployment failure detected')}
            >
              🔧 Simulate Self-Healing
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => simulateInput('scaling', 'High traffic detected, scaling needed')}
            >
              📈 Simulate Auto-Scaling
            </Button>
          </div>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Demo Mode:</strong> This system demonstrates professional deployment automation 
              with Groq AI reasoning. All deployments are simulated with realistic logs and lifecycle management.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}