'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  PlayIcon, 
  PauseIcon, 
  ArrowDownIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface LogEntry {
  id: string
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  source: string
  message: string
  metadata?: Record<string, any>
}

const mockLogs: LogEntry[] = [
  {
    id: '1',
    timestamp: '2024-01-15T10:30:00Z',
    level: 'info',
    source: 'build',
    message: 'Starting build process...',
  },
  {
    id: '2',
    timestamp: '2024-01-15T10:30:05Z',
    level: 'info',
    source: 'build',
    message: 'Installing dependencies with npm...',
  },
  {
    id: '3',
    timestamp: '2024-01-15T10:30:15Z',
    level: 'warn',
    source: 'build',
    message: 'Deprecated package found: @types/node@14.x.x',
  },
  {
    id: '4',
    timestamp: '2024-01-15T10:30:45Z',
    level: 'info',
    source: 'build',
    message: 'Build completed successfully',
  },
  {
    id: '5',
    timestamp: '2024-01-15T10:31:00Z',
    level: 'info',
    source: 'runtime',
    message: 'Starting application server on port 3000',
  },
  {
    id: '6',
    timestamp: '2024-01-15T10:31:02Z',
    level: 'error',
    source: 'runtime',
    message: 'Database connection failed: Connection timeout',
    metadata: { error: 'ETIMEDOUT', host: 'db.example.com' }
  },
]

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>(mockLogs)
  const [isStreaming, setIsStreaming] = useState(true)
  const [selectedApp, setSelectedApp] = useState('my-app')
  const [levelFilter, setLevelFilter] = useState<string[]>(['info', 'warn', 'error', 'debug'])
  const [searchQuery, setSearchQuery] = useState('')
  const [autoScroll, setAutoScroll] = useState(true)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const logsContainerRef = useRef<HTMLDivElement>(null)

  // Simulate real-time logs
  useEffect(() => {
    if (!isStreaming) return

    const interval = setInterval(() => {
      const newLog: LogEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        level: ['info', 'warn', 'error', 'debug'][Math.floor(Math.random() * 4)] as LogEntry['level'],
        source: ['runtime', 'build', 'system'][Math.floor(Math.random() * 3)],
        message: [
          'Processing request from 192.168.1.1',
          'Cache miss for key: user_session_123',
          'Memory usage: 45% of allocated',
          'New deployment detected',
          'Health check passed',
          'Database query executed in 23ms'
        ][Math.floor(Math.random() * 6)]
      }
      
      setLogs(prev => [...prev, newLog])
    }, 2000)

    return () => clearInterval(interval)
  }, [isStreaming])

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  const filteredLogs = logs.filter(log => {
    const matchesLevel = levelFilter.includes(log.level)
    const matchesSearch = searchQuery === '' || 
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.source.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesLevel && matchesSearch
  })

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-400'
      case 'warn': return 'text-yellow-400'
      case 'info': return 'text-blue-400'
      case 'debug': return 'text-gray-400'
      default: return 'text-gray-300'
    }
  }

  const handleScroll = () => {
    if (!logsContainerRef.current) return
    
    const { scrollTop, scrollHeight, clientHeight } = logsContainerRef.current
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10
    setAutoScroll(isAtBottom)
  }

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Live Logs</h1>
          <p className="text-gray-400 mt-1">Real-time application logs and system events</p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant={isStreaming ? 'success' : 'neutral'}>
            <div className={`w-2 h-2 rounded-full mr-2 ${isStreaming ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
            {isStreaming ? 'Live' : 'Paused'}
          </Badge>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0 sm:space-x-4">
            {/* Left controls */}
            <div className="flex items-center space-x-4">
              {/* App selector */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-300">App:</label>
                <select
                  value={selectedApp}
                  onChange={(e) => setSelectedApp(e.target.value)}
                  className="px-3 py-1 bg-gray-800 border border-gray-700 rounded text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="my-app">my-app</option>
                  <option value="api-service">api-service</option>
                  <option value="frontend">frontend</option>
                </select>
              </div>

              {/* Level filters */}
              <div className="flex items-center space-x-2">
                <FunnelIcon className="w-4 h-4 text-gray-400" />
                <div className="flex space-x-1">
                  {['error', 'warn', 'info', 'debug'].map((level) => (
                    <button
                      key={level}
                      onClick={() => {
                        setLevelFilter(prev => 
                          prev.includes(level) 
                            ? prev.filter(l => l !== level)
                            : [...prev, level]
                        )
                      }}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        levelFilter.includes(level)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right controls */}
            <div className="flex items-center space-x-3">
              {/* Search */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Controls */}
              <button
                onClick={() => setIsStreaming(!isStreaming)}
                className="flex items-center space-x-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition-colors"
              >
                {isStreaming ? (
                  <PauseIcon className="w-4 h-4" />
                ) : (
                  <PlayIcon className="w-4 h-4" />
                )}
                <span className="text-sm">{isStreaming ? 'Pause' : 'Resume'}</span>
              </button>

              <button
                onClick={() => {
                  const logText = filteredLogs.map(log => 
                    `[${formatTimestamp(log.timestamp)}] ${log.level.toUpperCase()} ${log.source}: ${log.message}`
                  ).join('\n')
                  
                  const blob = new Blob([logText], { type: 'text/plain' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `${selectedApp}-logs-${new Date().toISOString().split('T')[0]}.txt`
                  a.click()
                  URL.revokeObjectURL(url)
                }}
                className="flex items-center space-x-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition-colors"
              >
                <DocumentArrowDownIcon className="w-4 h-4" />
                <span className="text-sm">Export</span>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Terminal */}
      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Terminal Output</CardTitle>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400">{filteredLogs.length} entries</span>
              {!autoScroll && (
                <button
                  onClick={() => {
                    setAutoScroll(true)
                    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className="flex items-center space-x-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                >
                  <ArrowDownIcon className="w-3 h-3" />
                  <span>Scroll to bottom</span>
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 p-0">
          <div 
            ref={logsContainerRef}
            onScroll={handleScroll}
            className="h-full overflow-auto bg-gray-950 border border-gray-800 rounded-lg font-mono text-sm"
          >
            <div className="p-4 space-y-1">
              {filteredLogs.map((log) => (
                <div key={log.id} className="flex items-start space-x-3 py-1 hover:bg-gray-900/50 rounded px-2 -mx-2 transition-colors">
                  <span className="text-gray-500 text-xs font-mono min-w-[70px] mt-0.5">
                    {formatTimestamp(log.timestamp)}
                  </span>
                  <span className={`text-xs font-bold min-w-[50px] mt-0.5 ${getLevelColor(log.level)}`}>
                    {log.level.toUpperCase()}
                  </span>
                  <span className="text-gray-400 text-xs min-w-[60px] mt-0.5">
                    {log.source}
                  </span>
                  <span className="text-gray-200 flex-1 leading-relaxed">
                    {log.message}
                    {log.metadata && (
                      <div className="mt-1 text-xs text-gray-500">
                        {JSON.stringify(log.metadata, null, 2)}
                      </div>
                    )}
                  </span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}