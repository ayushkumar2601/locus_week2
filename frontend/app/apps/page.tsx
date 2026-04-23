'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  CubeIcon, 
  EllipsisVerticalIcon,
  PlayIcon,
  StopIcon,
  ArrowPathIcon,
  TrashIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  GlobeAltIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface App {
  id: string
  name: string
  status: 'running' | 'deploying' | 'failed' | 'stopped'
  url?: string
  repository: string
  branch: string
  lastDeployed: string
  instances: number
  cpu: number
  memory: number
  cost: number
  uptime: string
}

const mockApps: App[] = [
  {
    id: '1',
    name: 'my-nextjs-app',
    status: 'running',
    url: 'https://my-nextjs-app.deploy.ai',
    repository: 'github.com/user/my-nextjs-app',
    branch: 'main',
    lastDeployed: '2024-01-15T10:30:00Z',
    instances: 2,
    cpu: 45,
    memory: 67,
    cost: 24.50,
    uptime: '99.9%'
  },
  {
    id: '2',
    name: 'api-service',
    status: 'deploying',
    repository: 'github.com/user/api-service',
    branch: 'develop',
    lastDeployed: '2024-01-15T11:15:00Z',
    instances: 1,
    cpu: 0,
    memory: 0,
    cost: 12.00,
    uptime: '0%'
  },
  {
    id: '3',
    name: 'legacy-app',
    status: 'failed',
    repository: 'github.com/user/legacy-app',
    branch: 'main',
    lastDeployed: '2024-01-14T15:20:00Z',
    instances: 0,
    cpu: 0,
    memory: 0,
    cost: 0,
    uptime: '0%'
  },
  {
    id: '4',
    name: 'dashboard',
    status: 'stopped',
    repository: 'github.com/user/dashboard',
    branch: 'main',
    lastDeployed: '2024-01-13T09:45:00Z',
    instances: 0,
    cpu: 0,
    memory: 0,
    cost: 0,
    uptime: '0%'
  }
]

export default function AppsPage() {
  const [apps, setApps] = useState<App[]>(mockApps)
  const [selectedApp, setSelectedApp] = useState<string | null>(null)
  const [showDropdown, setShowDropdown] = useState<string | null>(null)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'success'
      case 'deploying': return 'info'
      case 'failed': return 'error'
      case 'stopped': return 'neutral'
      default: return 'neutral'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
      case 'deploying': return <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
      case 'failed': return <div className="w-2 h-2 bg-red-500 rounded-full"></div>
      case 'stopped': return <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
      default: return <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d ago`
  }

  const handleAction = (appId: string, action: string) => {
    console.log(`${action} app ${appId}`)
    setShowDropdown(null)
    // Implement actual actions here
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Applications</h1>
          <p className="text-gray-400 mt-1">Manage your deployed applications</p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href="/deploy"
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200"
          >
            <CubeIcon className="w-4 h-4" />
            <span>New Deployment</span>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Total Apps</p>
                <p className="text-2xl font-bold text-white">{apps.length}</p>
              </div>
              <CubeIcon className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Running</p>
                <p className="text-2xl font-bold text-green-400">
                  {apps.filter(app => app.status === 'running').length}
                </p>
              </div>
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Failed</p>
                <p className="text-2xl font-bold text-red-400">
                  {apps.filter(app => app.status === 'failed').length}
                </p>
              </div>
              <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Monthly Cost</p>
                <p className="text-2xl font-bold text-white">
                  ${apps.reduce((sum, app) => sum + app.cost, 0).toFixed(2)}
                </p>
              </div>
              <ChartBarIcon className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Apps Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {apps.map((app) => (
          <Card key={app.id} hover className="relative">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(app.status)}
                  <div>
                    <CardTitle className="text-lg">{app.name}</CardTitle>
                    <CardDescription className="flex items-center space-x-2 mt-1">
                      <span>{app.repository.split('/').pop()}</span>
                      <span className="text-gray-600">•</span>
                      <span>{app.branch}</span>
                    </CardDescription>
                  </div>
                </div>
                
                <div className="relative">
                  <button
                    onClick={() => setShowDropdown(showDropdown === app.id ? null : app.id)}
                    className="p-1 hover:bg-gray-800 rounded transition-colors"
                  >
                    <EllipsisVerticalIcon className="w-5 h-5 text-gray-400" />
                  </button>
                  
                  {showDropdown === app.id && (
                    <div className="absolute right-0 top-8 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 animate-fade-in">
                      <div className="py-1">
                        {app.status === 'running' && (
                          <>
                            <button
                              onClick={() => handleAction(app.id, 'stop')}
                              className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                            >
                              <StopIcon className="w-4 h-4" />
                              <span>Stop</span>
                            </button>
                            <button
                              onClick={() => handleAction(app.id, 'restart')}
                              className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                            >
                              <ArrowPathIcon className="w-4 h-4" />
                              <span>Restart</span>
                            </button>
                          </>
                        )}
                        
                        {(app.status === 'stopped' || app.status === 'failed') && (
                          <button
                            onClick={() => handleAction(app.id, 'start')}
                            className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                          >
                            <PlayIcon className="w-4 h-4" />
                            <span>Start</span>
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleAction(app.id, 'settings')}
                          className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                        >
                          <Cog6ToothIcon className="w-4 h-4" />
                          <span>Settings</span>
                        </button>
                        
                        <div className="border-t border-gray-700 my-1"></div>
                        
                        <button
                          onClick={() => handleAction(app.id, 'delete')}
                          className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-400 hover:bg-gray-700 transition-colors"
                        >
                          <TrashIcon className="w-4 h-4" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2 mt-3">
                <Badge variant={getStatusColor(app.status)}>
                  {app.status}
                </Badge>
                {app.url && (
                  <a
                    href={app.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <GlobeAltIcon className="w-3 h-3" />
                    <span>Visit</span>
                  </a>
                )}
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                {/* Metrics */}
                {app.status === 'running' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-400">CPU Usage</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="flex-1 bg-gray-800 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${app.cpu}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-300">{app.cpu}%</span>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-400">Memory</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="flex-1 bg-gray-800 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${app.memory}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-300">{app.memory}%</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Instances</p>
                    <p className="text-white font-medium">{app.instances}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Uptime</p>
                    <p className="text-white font-medium">{app.uptime}</p>
                  </div>
                </div>
              </div>
            </CardContent>
            
            <CardFooter>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <ClockIcon className="w-4 h-4" />
                  <span>{formatDate(app.lastDeployed)}</span>
                </div>
                <div className="text-sm font-medium text-green-400">
                  ${app.cost.toFixed(2)}/mo
                </div>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {apps.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <CubeIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No applications deployed</h3>
            <p className="text-gray-400 mb-6">Get started by deploying your first application</p>
            <Link
              href="/deploy"
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200"
            >
              <CubeIcon className="w-4 h-4" />
              <span>Deploy Now</span>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}