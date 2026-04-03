import { useState } from 'react';
import { Zap, Copy, Check, ArrowRight } from 'lucide-react';
import { setKey } from '../lib/api';

type Step = 'choose' | 'login' | 'register' | 'success';

export function Login({ onLogin }: { onLogin: () => void }) {
  const [step, setStep] = useState<Step>('choose');
  const [name, setName] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const [clientName, setClientName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleRegister() {
    if (!name.trim()) { setError('Please enter a name'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:3000/api/v1/clients/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      console.log('Register response:', data);
      if (data.success && data.data?.apiKey) {
        setGeneratedKey(data.data.apiKey);
        setClientName(data.data.name);
        setStep('success');
      } else {
        setError(data.message || 'Registration failed. Try again.');
      }
    } catch (e) {
      setError('Cannot connect to server. Make sure npm run dev is running on port 3000.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin() {
    if (!apiKeyInput.trim()) { setError('Please enter your API key'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:3000/api/v1/health', {
        headers: { 'x-api-key': apiKeyInput.trim() },
      });
      if (res.ok) {
        setKey(apiKeyInput.trim());
        onLogin();
      } else {
        setError('Invalid API key. Check and try again.');
      }
    } catch {
      setError('Cannot connect to server. Make sure npm run dev is running on port 3000.');
    } finally {
      setLoading(false);
    }
  }

  function copyKey() {
    navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function enterDashboard() {
    setKey(generatedKey);
    onLogin();
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500 flex items-center justify-center">
            <Zap size={26} className="text-white" />
          </div>
        </div>

        {/* CHOOSE step */}
        {step === 'choose' && (
          <div className="bg-[#111] border border-[#222] rounded-2xl p-8 text-center">
            <h1 className="text-2xl font-semibold text-white mb-2">WebhookEngine</h1>
            <p className="text-sm text-zinc-500 mb-8">Production grade webhook delivery system</p>
            <div className="space-y-3">
              <button
                onClick={() => { setStep('register'); setError(''); }}
                className="w-full bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl py-3.5 text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                Create new account
                <ArrowRight size={16} />
              </button>
              <button
                onClick={() => { setStep('login'); setError(''); }}
                className="w-full bg-[#1a1a1a] hover:bg-[#222] border border-[#333] text-zinc-300 rounded-xl py-3.5 text-sm font-medium transition-colors"
              >
                Sign in with API key
              </button>
            </div>
          </div>
        )}

        {/* REGISTER step */}
        {step === 'register' && (
          <div className="bg-[#111] border border-[#222] rounded-2xl p-8">
            <button onClick={() => setStep('choose')} className="text-xs text-zinc-600 hover:text-zinc-400 mb-6 flex items-center gap-1">
              ← Back
            </button>
            <h2 className="text-xl font-semibold text-white mb-1">Create account</h2>
            <p className="text-sm text-zinc-500 mb-6">Get your API key to start delivering webhooks</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">Your name or project name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleRegister()}
                  placeholder="e.g. Vaibhav or My Project"
                  autoFocus
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              {error && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-lg px-4 py-3">
                  <p className="text-xs text-red-400">{error}</p>
                </div>
              )}
              <button
                onClick={handleRegister}
                disabled={loading}
                className="w-full bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl py-3 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loading ? 'Creating account...' : 'Create Account & Get API Key'}
              </button>
            </div>
          </div>
        )}

        {/* LOGIN step */}
        {step === 'login' && (
          <div className="bg-[#111] border border-[#222] rounded-2xl p-8">
            <button onClick={() => setStep('choose')} className="text-xs text-zinc-600 hover:text-zinc-400 mb-6 flex items-center gap-1">
              ← Back
            </button>
            <h2 className="text-xl font-semibold text-white mb-1">Sign in</h2>
            <p className="text-sm text-zinc-500 mb-6">Enter the API key you received when registering</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">API Key</label>
                <input
                  type="text"
                  value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="whe_..."
                  autoFocus
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-700 font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              {error && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-lg px-4 py-3">
                  <p className="text-xs text-red-400">{error}</p>
                </div>
              )}
              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl py-3 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Sign In'}
              </button>
            </div>
          </div>
        )}

        {/* SUCCESS step — show API key */}
        {step === 'success' && (
          <div className="bg-[#111] border border-[#222] rounded-2xl p-8">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 mx-auto mb-4">
              <Check size={22} className="text-green-400" />
            </div>
            <h2 className="text-xl font-semibold text-white text-center mb-1">
              Welcome, {clientName}!
            </h2>
            <p className="text-sm text-zinc-500 text-center mb-6">
              Your account is ready. Save your API key — it won't be shown again.
            </p>

            <div className="bg-[#0a0a0a] border border-[#333] rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-600 uppercase tracking-wider">Your API Key</span>
                <button
                  onClick={copyKey}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
                >
                  {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-sm font-mono text-indigo-400 break-all leading-relaxed">
                {generatedKey}
              </p>
            </div>

            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl px-4 py-3 mb-6">
              <p className="text-xs text-yellow-400">
                ⚠ Store this key safely. You won't be able to see it again after closing this page.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={copyKey}
                className="w-full flex items-center justify-center gap-2 bg-[#1a1a1a] border border-[#333] text-zinc-300 rounded-xl py-3 text-sm font-medium transition-colors hover:bg-[#222]"
              >
                {copied ? <Check size={15} className="text-green-400" /> : <Copy size={15} />}
                {copied ? 'Copied to clipboard!' : 'Copy API Key'}
              </button>
              <button
                onClick={enterDashboard}
                className="w-full flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl py-3 text-sm font-medium transition-colors"
              >
                Enter Dashboard
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}