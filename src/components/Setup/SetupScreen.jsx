import { Database, Copy, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'

const Step = ({ n, title, children }) => (
  <div className="flex gap-4">
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-sm font-bold">
      {n}
    </div>
    <div className="pb-6 border-b border-gray-100 flex-1 last:border-0 last:pb-0">
      <p className="font-semibold text-gray-900 mb-1">{title}</p>
      <div className="text-sm text-gray-500 space-y-1">{children}</div>
    </div>
  </div>
)

const CopyBox = ({ value }) => {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex items-center gap-2 mt-2 bg-gray-900 rounded-xl px-4 py-3 font-mono text-xs text-green-400">
      <span className="flex-1 whitespace-pre">{value}</span>
      <button
        onClick={() => {
          navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }}
        className="text-gray-400 hover:text-white flex-shrink-0"
      >
        {copied ? <CheckCircle2 size={14} className="text-green-400" /> : <Copy size={14} />}
      </button>
    </div>
  )
}

const ENV_TEMPLATE = `VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here`

export default function SetupScreen() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-black p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Database size={24} />
            <h1 className="text-xl font-bold">Connect Thunder POS to the Cloud</h1>
          </div>
          <p className="text-gray-400 text-sm">
            Follow these steps once — then every device you install this on will share the same data in real time.
          </p>
        </div>

        <div className="p-6 space-y-0">
          <Step n="1" title="Create a free Supabase account">
            <p>
              Go to{' '}
              <a href="https://supabase.com" target="_blank" rel="noreferrer" className="underline text-blue-600">
                supabase.com
              </a>{' '}
              → Sign up → Create a new project (any name, any region).
            </p>
          </Step>

          <Step n="2" title="Run the database schema">
            <p>
              In your Supabase project → <strong>SQL Editor</strong> → paste and run the contents of{' '}
              <code className="bg-gray-100 px-1 rounded text-gray-700">schema.sql</code> (in the caisse folder).
              This creates all the tables.
            </p>
          </Step>

          <Step n="3" title="Copy your project credentials">
            <p>
              Go to <strong>Project Settings → API</strong>. Copy:
              <br />• <strong>Project URL</strong> (looks like https://xxxx.supabase.co)
              <br />• <strong>anon public</strong> key (starts with eyJ…)
            </p>
          </Step>

          <Step n="4" title='Create a ".env" file'>
            <p>
              In the <code className="bg-gray-100 px-1 rounded text-gray-700">caisse</code> folder, create a file
              named exactly <code className="bg-gray-100 px-1 rounded text-gray-700">.env</code> with this content
              (replace with your values):
            </p>
            <CopyBox value={ENV_TEMPLATE} />
          </Step>

          <Step n="5" title="Restart the dev server">
            <p>
              Stop the terminal and run{' '}
              <code className="bg-gray-100 px-1 rounded text-gray-700">npm run dev</code> again. The app will
              connect and sync across all devices automatically.
            </p>
            <p className="mt-2 text-gray-400">
              To share with others: deploy to Netlify (free) and set the two env vars in Netlify's dashboard.
              Everyone opens the URL and can install it from their browser.
            </p>
          </Step>
        </div>
      </div>
    </div>
  )
}
