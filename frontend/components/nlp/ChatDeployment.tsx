'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  PaperAirplaneIcon,
  SparklesIcon,
  RocketLaunchIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  type?: 'clarification' | 'deployment' | 'error' | 'success'
  deploymentId?: string
  questions?: Array<{
    type: string
    question: string
    options?: string[]
  }>
  parsedConfig?: any
}

interface ChatDeploymentProps {
  onDeploymentStarted?: (deploymentId: string) => void
  onDeploymentCompleted?: (deploymentId: string) => void
}

export default function ChatDeployment({ onDeploymentStarted, onDeploymentCompleted }: ChatDeploymentProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "👋 Hi! I'm your AI DevOps engineer. Tell me what you'd like to deploy and I'll handle everything for you!\n\nTry something like:\n• \"Deploy a MERN app with authentication\"\n• \"Create a Django API with PostgreSQL\"\n• \"Launch a Next.js site with payments\"",
      timestamp: Date.now()
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [pendingQuestions, setPendingQuestions] = useState<any[]>([])
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async (message: string, isFollowUp = false) => {
    if (!message.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: Date.now()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      const endpoint = isFollowUp ? '/api/nlp/clarify' : '/api/nlp/deploy'
      const body = isFollowUp 
        ? { conversationId, response: message, questionType: 'general' }
        : { message, conversationId }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.message || 'Request failed')
      }

      // Update conversation ID
      if (data.conversationId) {
        setConversationId(data.conversationId)
      }

      // Create assistant response
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: Date.now(),
        type: data.type,
        deploymentId: data.deploymentId,
        questions: data.questions,
        parsedConfig: data.parsedConfig
      }

      setMessages(prev => [...prev, assistantMessage])

      // Handle different response types
      if (data.type === 'clarification' && data.questions) {
        setPendingQuestions(data.questions)
      } else {
        setPendingQuestions([])
      }

      if (data.type === 'deployment' && data.deploymentId) {
        onDeploymentStarted?.(data.deploymentId)
        // Start monitoring deployment
        monitorDeployment(data.deploymentId)
      }

    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try rephrasing your request or be more specific about what you'd like to deploy.`,
        timestamp: Date.now(),
        type: 'error'
      }

      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickResponse = (response: string) => {
    sendMessage(response, true)
    setPendingQuestions([])
  }

  const monitorDeployment = async (deploymentId: string) => {
    const maxChecks = 20
    let checks = 0

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/nlp/deployment/${deploymentId}/status`)
        const data = await response.json()

        if (data.success) {
          const statusMessage: Message = {
            id: `status-${Date.now()}`,
            role: 'assistant',
            content: data.message,
            timestamp: Date.now(),
            type: data.status === 'SUCCESS' ? 'success' : 'deployment',
            deploymentId
          }

          setMessages(prev => [...prev, statusMessage])

          if (data.status === 'SUCCESS') {
            onDeploymentCompleted?.(deploymentId)
            return // Stop monitoring
          } else if (data.status === 'FAILED') {
            return // Stop monitoring
          }
        }

        checks++
        if (checks < maxChecks) {
          setTimeout(checkStatus, 10000) // Check every 10 seconds
        }

      } catch (error) {
        console.error('Error monitoring deployment:', error)
      }
    }

    // Start monitoring after a short delay
    setTimeout(checkStatus, 5000)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(inputValue)
  }

  const getMessageIcon = (message: Message) => {
    if (message.role === 'user') return null
    
    switch (message.type) {
      case 'deployment':
        return <RocketLaunchIcon className="w-5 h-5 text-blue-400" />
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 text-green-400" />
      case 'error':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
      case 'clarification':
        return <SparklesIcon className="w-5 h-5 text-yellow-400" />
      default:
        return <SparklesIcon className="w-5 h-5 text-purple-400" />
    }
  }

  const getMessageBadge = (message: Message) => {
    if (message.role === 'user') return null
    
    switch (message.type) {
      case 'deployment':
        return <Badge variant="info">Deploying</Badge>
      case 'success':
        return <Badge variant="success">Completed</Badge>
      case 'error':
        return <Badge variant="error">Error</Badge>
      case 'clarification':
        return <Badge variant="warning">Needs Info</Badge>
      default:
        return null
    }
  }

  const examplePrompts = [
    "Deploy a MERN app with authentication",
    "Create a Django API with PostgreSQL",
    "Launch a Next.js site with Stripe payments",
    "Build a Rails app with Redis caching"
  ]

  return (
    <div className="flex flex-col h-full max-h-[800px] bg-gray-900 rounded-lg border border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
            <SparklesIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">AI DevOps Engineer</h3>
            <p className="text-sm text-gray-400">Natural Language Deployment</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-400">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-100'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="flex items-center space-x-2 mb-2">
                  {getMessageIcon(message)}
                  <span className="text-sm font-medium text-gray-300">AI DevOps Engineer</span>
                  {getMessageBadge(message)}
                </div>
              )}
              
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {message.content}
              </div>

              {/* Parsed Configuration Display */}
              {message.parsedConfig && (
                <div className="mt-3 p-3 bg-gray-700 rounded-lg">
                  <div className="text-xs text-gray-400 mb-2">Parsed Configuration:</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {message.parsedConfig.stack && (
                      <div>
                        <span className="text-gray-400">Stack:</span>
                        <span className="text-blue-400 ml-1">{message.parsedConfig.stack}</span>
                      </div>
                    )}
                    {message.parsedConfig.database?.type && (
                      <div>
                        <span className="text-gray-400">Database:</span>
                        <span className="text-green-400 ml-1">{message.parsedConfig.database.type}</span>
                      </div>
                    )}
                    {message.parsedConfig.features?.length > 0 && (
                      <div className="col-span-2">
                        <span className="text-gray-400">Features:</span>
                        <span className="text-yellow-400 ml-1">{message.parsedConfig.features.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Quick Response Options */}
              {message.questions && message.questions.length > 0 && (
                <div className="mt-3 space-y-2">
                  {message.questions.map((question, index) => (
                    <div key={index} className="p-2 bg-gray-700 rounded">
                      <div className="text-sm text-gray-300 mb-2">{question.question}</div>
                      {question.options && (
                        <div className="flex flex-wrap gap-2">
                          {question.options.map((option, optIndex) => (
                            <button
                              key={optIndex}
                              onClick={() => handleQuickResponse(option)}
                              className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Deployment ID */}
              {message.deploymentId && (
                <div className="mt-2 text-xs text-gray-400">
                  Deployment ID: {message.deploymentId}
                </div>
              )}

              <div className="text-xs text-gray-500 mt-2">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-lg p-3 max-w-[80%]">
              <div className="flex items-center space-x-2">
                <SparklesIcon className="w-5 h-5 text-purple-400" />
                <span className="text-sm font-medium text-gray-300">AI DevOps Engineer</span>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-gray-400">Analyzing your request...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Example Prompts */}
      {messages.length === 1 && (
        <div className="px-4 pb-2">
          <div className="text-xs text-gray-400 mb-2">Try these examples:</div>
          <div className="flex flex-wrap gap-2">
            {examplePrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => sendMessage(prompt)}
                className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-full transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-800">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Describe what you want to deploy..."
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <ClockIcon className="w-5 h-5 animate-spin" />
            ) : (
              <PaperAirplaneIcon className="w-5 h-5" />
            )}
          </button>
        </form>
        
        <div className="mt-2 text-xs text-gray-500">
          💡 Be specific about your stack, features, and requirements for best results
        </div>
      </div>
    </div>
  )
}