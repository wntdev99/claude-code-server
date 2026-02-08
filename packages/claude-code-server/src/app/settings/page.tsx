'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Setting {
  key: string;
  value: string;
  updatedAt: string;
}

const KNOWN_SETTINGS = [
  {
    key: 'claude_model',
    label: 'Claude Model',
    description: 'Model to use for agent execution',
    placeholder: 'claude-sonnet-4-5',
    sensitive: false,
  },
  {
    key: 'claude_max_tokens',
    label: 'Max Tokens',
    description: 'Maximum tokens per request',
    placeholder: '8000',
    sensitive: false,
  },
  {
    key: 'github_token',
    label: 'GitHub Token',
    description: 'Personal access token for GitHub integration',
    placeholder: 'ghp_...',
    sensitive: true,
  },
  {
    key: 'vercel_token',
    label: 'Vercel Token',
    description: 'Token for Vercel deployment integration',
    placeholder: 'vercel_...',
    sensitive: true,
  },
  {
    key: 'output_directory',
    label: 'Output Directory',
    description: 'Root directory for task workspaces',
    placeholder: './projects',
    sensitive: false,
  },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success) {
        setSettings(data.data);
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  }

  function getCurrentValue(key: string): string {
    const setting = settings.find((s) => s.key === key);
    return setting?.value || '';
  }

  function getEditValue(key: string): string {
    if (key in editValues) return editValues[key];
    return '';
  }

  function setEditValue(key: string, value: string) {
    setEditValues((prev) => ({ ...prev, [key]: value }));
  }

  async function saveSetting(key: string) {
    const value = editValues[key];
    if (!value || !value.trim()) return;

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Setting "${key}" updated successfully` });
        setEditValues((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        await fetchSettings();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <p className="text-gray-500">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <Link href="/" className="text-blue-600 hover:underline text-sm">
          Back to Tasks
        </Link>
      </div>

      {message && (
        <div
          className={`mb-4 p-3 rounded text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {KNOWN_SETTINGS.map((setting) => {
          const currentValue = getCurrentValue(setting.key);
          const editValue = getEditValue(setting.key);

          return (
            <div
              key={setting.key}
              className="border rounded-lg p-4 bg-white shadow-sm"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-medium text-gray-900">{setting.label}</h3>
                  <p className="text-sm text-gray-500">{setting.description}</p>
                </div>
                {setting.sensitive && (
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                    Encrypted
                  </span>
                )}
              </div>

              {currentValue && (
                <p className="text-sm text-gray-600 mb-2">
                  Current: <code className="bg-gray-100 px-1 rounded">{currentValue}</code>
                </p>
              )}

              <div className="flex gap-2">
                <input
                  type={setting.sensitive ? 'password' : 'text'}
                  placeholder={setting.placeholder}
                  value={editValue}
                  onChange={(e) => setEditValue(setting.key, e.target.value)}
                  className="flex-1 border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => saveSetting(setting.key)}
                  disabled={saving || !editValue.trim()}
                  className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom settings section */}
      <div className="mt-8 border-t pt-6">
        <h2 className="text-lg font-semibold mb-4">All Settings</h2>
        {settings.length === 0 ? (
          <p className="text-gray-500 text-sm">No settings configured yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium">Key</th>
                <th className="text-left py-2 font-medium">Value</th>
                <th className="text-left py-2 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {settings.map((s) => (
                <tr key={s.key} className="border-b">
                  <td className="py-2 font-mono text-gray-700">{s.key}</td>
                  <td className="py-2 font-mono text-gray-600">{s.value}</td>
                  <td className="py-2 text-gray-500">
                    {new Date(s.updatedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
