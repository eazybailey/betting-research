'use client';

import { UserSettings } from '@/lib/types';

interface SettingsPanelProps {
  settings: UserSettings;
  onUpdate: (updates: Partial<UserSettings>) => void;
  onReset: () => void;
  onClose: () => void;
}

export default function SettingsPanel({
  settings,
  onUpdate,
  onReset,
  onClose,
}: SettingsPanelProps) {
  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex justify-end">
      <div className="w-full max-w-sm bg-white shadow-xl h-full overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            &times;
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* Bankroll */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
              Bankroll (£)
            </label>
            <input
              type="number"
              value={settings.bankroll}
              onChange={(e) => onUpdate({ bankroll: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              min={0}
              step={100}
            />
          </div>

          {/* Exchange Settings */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Exchange Settings
            </label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-28">Commission</span>
                <input
                  type="number"
                  value={settings.commission * 100}
                  onChange={(e) =>
                    onUpdate({ commission: (parseFloat(e.target.value) || 0) / 100 })
                  }
                  className="flex-1 px-3 py-1.5 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  min={0}
                  max={20}
                  step={0.5}
                />
                <span className="text-xs text-gray-400">%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-28">Min Stake</span>
                <input
                  type="number"
                  value={settings.minStake}
                  onChange={(e) =>
                    onUpdate({ minStake: parseFloat(e.target.value) || 0 })
                  }
                  className="flex-1 px-3 py-1.5 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  min={0}
                  max={100}
                  step={1}
                />
                <span className="text-xs text-gray-400">£</span>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              Betfair: 5% commission, £2 min stake
            </p>
          </div>

          {/* Compression Thresholds */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Compression Thresholds (%)
            </label>
            <div className="space-y-2">
              {(['conservative', 'strong', 'premium'] as const).map((level) => (
                <div key={level} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-24 capitalize">{level}</span>
                  <input
                    type="number"
                    value={settings.thresholds[level]}
                    onChange={(e) =>
                      onUpdate({
                        thresholds: {
                          ...settings.thresholds,
                          [level]: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    className="flex-1 px-3 py-1.5 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    min={0}
                    max={100}
                    step={1}
                  />
                  <span className="text-xs text-gray-400">%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Kelly mode */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Kelly Criterion
            </label>
            <div className="flex gap-2 mb-2">
              {(['full', 'half', 'custom'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    const multiplier = mode === 'full' ? 1 : mode === 'half' ? 0.5 : settings.kellyMultiplier;
                    onUpdate({ kellyMode: mode, kellyMultiplier: multiplier });
                  }}
                  className={`flex-1 px-3 py-1.5 text-xs rounded border transition-colors ${
                    settings.kellyMode === mode
                      ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold'
                      : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {mode === 'full' ? 'Full' : mode === 'half' ? 'Half' : 'Custom'}
                </button>
              ))}
            </div>
            {settings.kellyMode === 'custom' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Multiplier</span>
                <input
                  type="number"
                  value={settings.kellyMultiplier}
                  onChange={(e) =>
                    onUpdate({ kellyMultiplier: parseFloat(e.target.value) || 0 })
                  }
                  className="flex-1 px-3 py-1.5 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  min={0}
                  max={2}
                  step={0.1}
                />
              </div>
            )}
          </div>

          {/* Max liability */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
              Max Liability (% of bankroll)
            </label>
            <input
              type="number"
              value={settings.maxLiabilityPct}
              onChange={(e) =>
                onUpdate({ maxLiabilityPct: parseFloat(e.target.value) || 0 })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              min={0}
              max={25}
              step={0.5}
            />
          </div>

          {/* Field size filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Field Size Filter
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Min</span>
              <input
                type="number"
                value={settings.fieldSizeMin}
                onChange={(e) =>
                  onUpdate({ fieldSizeMin: parseInt(e.target.value) || 1 })
                }
                className="flex-1 px-3 py-1.5 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                min={1}
                max={30}
              />
              <span className="text-xs text-gray-500">Max</span>
              <input
                type="number"
                value={settings.fieldSizeMax}
                onChange={(e) =>
                  onUpdate({ fieldSizeMax: parseInt(e.target.value) || 30 })
                }
                className="flex-1 px-3 py-1.5 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                min={1}
                max={30}
              />
            </div>
          </div>

          {/* Probability Model */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Probability Model
            </label>
            <p className="text-[10px] text-gray-400 mb-2">
              P(win) = 1 / (1 + alpha * (O-1)^beta). Default alpha=1, beta=1 uses raw implied probability.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-16">Alpha</span>
                <input
                  type="number"
                  value={settings.modelAlpha}
                  onChange={(e) =>
                    onUpdate({ modelAlpha: parseFloat(e.target.value) || 1 })
                  }
                  className="flex-1 px-3 py-1.5 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  min={0.01}
                  max={10}
                  step={0.01}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-16">Beta</span>
                <input
                  type="number"
                  value={settings.modelBeta}
                  onChange={(e) =>
                    onUpdate({ modelBeta: parseFloat(e.target.value) || 1 })
                  }
                  className="flex-1 px-3 py-1.5 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  min={0.01}
                  max={5}
                  step={0.01}
                />
              </div>
            </div>
          </div>

          {/* Reset */}
          <div className="pt-2 border-t border-gray-100">
            <button
              onClick={onReset}
              className="w-full px-3 py-2 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
