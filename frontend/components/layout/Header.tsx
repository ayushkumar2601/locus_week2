'use client'

import { useState } from 'react'
import {
  MagnifyingGlassIcon,
  BellIcon,
  CommandLineIcon,
  CpuChipIcon,
  ServerIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { Badge } from '@/components/ui/Badge'

interface SystemMetric {
  name: string
  value: string
  status: 'healthy' | 'warning' | 'error'
  icon: React.ComponentType<{ className?: string }>
}

const systemMetrics: SystemMetric[] = [
  {
    name: 'Active Deployments',
    value: '12',
    status: 'healthy',
    icon: ServerIcon
  },
  {
    name: 'CPU Usage',
    value: '34%',
    status: 'healthy',
    icon: CpuChipIcon
  },
  {
    name: 'Alerts',
    value: '2',
    status: 'warning',
    icon: ExclamationTriangleIcon
  }
]

export default function Header() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)

  const notifications = [
    {
      id: 1,
      type: 'success',
      title: 'Deployment Completed',
      message: 'my-app deployed successfully to production',
      time: '2 minutes ago',
      read: false
    },
    {
      id: 2,
      type: 'warning',
      title: 'High Memory Usage',
      message: 'api-service using 85% memory',
      time: '5 minutes ago',
      read: false
    },
    {
      id: 3,
      type: 'info',
      title: 'Cost Optimization',
      message: 'Potential savings of $120/month identified',
      time: '1 hour ago',
      read: true
    }
  ]

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Search */}
        <div className="flex-1 max-w-lg">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search deployments, logs, or commands..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchQuery && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
                <div className="p-2">
                  <div className="text-xs text-gray-400 mb-2">Quick Actions</div>
                  <div className="space-y-1">
                    <button className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded flex items-center space-x-2">
                      <CommandLineIcon className="w-4 h-4" />
                      <span>Deploy new application</span>
                    </button>
                    <button className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded flex items-center space-x-2">
                      <ServerIcon className="w-4 h-4" />
                      <span>View deployment logs</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* System Metrics */}
        <div className="hidden lg:flex items-center space-x-6 mx-8">
          {systemMetrics.map((metric) => {
            const Icon = metric.icon
            return (
              <div key={metric.name} className="flex items-center space-x-2">
                <div className={`p-2 rounded-lg ${
                  metric.status === 'healthy' ? 'bg-green-900/20' :
                  metric.status === 'warning' ? 'bg-yellow-900/20' :
                  'bg-red-900/20'
                }`}>
                  <Icon className={`w-4 h-4 ${
                    metric.status === 'healthy' ? 'text-green-400' :
                    metric.status === 'warning' ? 'text-yellow-400' :
                    'text-red-400'
                  }`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{metric.value}</p>
                  <p className="text-xs text-gray-400">{metric.name}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <BellIcon className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
                <div className="p-4 border-b border-gray-700">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-white">Notifications</h3>
                    <Badge variant="info">{unreadCount} new</Badge>
                  </div>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border-b border-gray-700 hover:bg-gray-700/50 transition-colors ${
                        !notification.read ? 'bg-blue-900/10' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          notification.type === 'success' ? 'bg-green-400' :
                          notification.type === 'warning' ? 'bg-yellow-400' :
                          notification.type === 'error' ? 'bg-red-400' :
                          'bg-blue-400'
                        }`}></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{notification.title}</p>
                          <p className="text-sm text-gray-400 mt-1">{notification.message}</p>
                          <p className="text-xs text-gray-500 mt-2">{notification.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-gray-700">
                  <button className="w-full text-sm text-blue-400 hover:text-blue-300 transition-colors">
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Deploy */}
          <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-lg shadow-blue-600/20">
            Quick Deploy
          </button>
        </div>
      </div>

      {/* Mobile System Metrics */}
      <div className="lg:hidden mt-4 grid grid-cols-3 gap-4">
        {systemMetrics.map((metric) => {
          const Icon = metric.icon
          return (
            <div key={metric.name} className="flex items-center space-x-2 p-3 bg-gray-800 rounded-lg">
              <Icon className={`w-4 h-4 ${
                metric.status === 'healthy' ? 'text-green-400' :
                metric.status === 'warning' ? 'text-yellow-400' :
                'text-red-400'
              }`} />
              <div>
                <p className="text-sm font-medium text-white">{metric.value}</p>
                <p className="text-xs text-gray-400">{metric.name}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Click outside to close notifications */}
      {showNotifications && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowNotifications(false)}
        />
      )}
    </header>
  )
}