import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

function App() {
  const [count, setCount] = useState(0)
  const [text, setText] = useState('')

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-500 to-violet-500 flex items-center justify-center text-xl font-bold">
              C
            </div>
            <span className="text-xl font-semibold">Cheatron</span>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="border-slate-700 text-slate-300">
              v1.0.0
            </Badge>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700 mb-8">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-sm text-slate-300">Production Ready</span>
        </div>

        <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
          Build Desktop Apps
          <br />
          <span className="bg-linear-to-r from-blue-400 via-violet-400 to-purple-400 text-transparent bg-clip-text">
            The Modern Way
          </span>
        </h1>

        <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto">
          Lightning-fast Electron app with React, TypeScript, Vite, and shadcn/ui. Everything you
          need to build beautiful desktop applications.
        </p>

        <div className="flex gap-4 justify-center mb-16">
          <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
            Get Started
          </Button>
          <Button size="lg" variant="outline" className="border-slate-700 hover:bg-slate-800">
            Documentation
          </Button>
        </div>

        {/* Tech Stack */}
        <div className="flex flex-wrap gap-3 justify-center">
          <Badge className="bg-slate-800 text-slate-200 hover:bg-slate-700 border-0">
            Electron
          </Badge>
          <Badge className="bg-slate-800 text-slate-200 hover:bg-slate-700 border-0">
            React 19
          </Badge>
          <Badge className="bg-slate-800 text-slate-200 hover:bg-slate-700 border-0">
            TypeScript
          </Badge>
          <Badge className="bg-slate-800 text-slate-200 hover:bg-slate-700 border-0">Vite</Badge>
          <Badge className="bg-slate-800 text-slate-200 hover:bg-slate-700 border-0">
            Tailwind CSS
          </Badge>
          <Badge className="bg-slate-800 text-slate-200 hover:bg-slate-700 border-0">
            shadcn/ui
          </Badge>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Counter Card */}
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <CardTitle className="text-slate-100">Counter</CardTitle>
              <CardDescription className="text-slate-400">
                Interactive state management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-6">
                <div className="text-5xl font-bold text-blue-400 mb-4">{count}</div>
                <Button
                  onClick={() => setCount(count + 1)}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Increment
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Input Card */}
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-violet-500/10 flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-violet-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </div>
              <CardTitle className="text-slate-100">Input</CardTitle>
              <CardDescription className="text-slate-400">
                Form controls & validation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Type something..."
                value={text}
                onChange={e => setText(e.target.value)}
                className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500"
              />
              {text && (
                <p className="text-sm text-slate-400 mt-4 text-center">
                  You typed: <span className="text-violet-400 font-medium">{text}</span>
                </p>
              )}
            </CardContent>
          </Card>

          {/* Buttons Card */}
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                  />
                </svg>
              </div>
              <CardTitle className="text-slate-100">Components</CardTitle>
              <CardDescription className="text-slate-400">Beautiful UI elements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full border-slate-700 hover:bg-slate-800 text-slate-200"
              >
                Outline
              </Button>
              <Button
                variant="secondary"
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200"
              >
                Secondary
              </Button>
              <Button variant="ghost" className="w-full hover:bg-slate-800 text-slate-300">
                Ghost
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-400 text-sm">Built with ❤️ using modern web technologies</p>
            <div className="flex gap-6">
              <a href="#" className="text-slate-400 hover:text-slate-200 text-sm transition-colors">
                GitHub
              </a>
              <a href="#" className="text-slate-400 hover:text-slate-200 text-sm transition-colors">
                Documentation
              </a>
              <a href="#" className="text-slate-400 hover:text-slate-200 text-sm transition-colors">
                License
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
