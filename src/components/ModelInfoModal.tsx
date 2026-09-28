"use client";

import { costPerLakhChars, formatInr, formatUsd, type Pricing } from "@/lib/pricing";

export interface ModelCardInfo {
  id: string;
  label: string;
  inputTokenLimit: number;
  outputTokenLimit: number;
  badge?: string;
  pricing?: Pricing;
}

export default function ModelInfoModal({
  models,
  selectedModel,
  fetchedAt,
  onClose,
  accentBadgeClassName = "bg-amber-500/15 text-amber-400 border-amber-500/25",
  selectedBadgeClassName = "bg-cyan-500/15 text-cyan-300 border-cyan-500/25",
}: {
  models: ModelCardInfo[];
  selectedModel: string;
  fetchedAt: number | null;
  onClose: () => void;
  accentBadgeClassName?: string;
  selectedBadgeClassName?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close model list"
      />
      <div className="relative w-full max-w-4xl glass-card p-5 sm:p-6 border border-[#2a2d3a] max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm sm:text-base font-semibold text-white font-display">Model Token Limits &amp; Pricing</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 transition-colors text-lg leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <p className="text-[11px] text-gray-500 font-display mb-4">
          {fetchedAt
            ? `Live catalog, cached ${new Date(fetchedAt).toLocaleDateString()} (refreshes every 7 days).`
            : "Showing the default model list."}
          {" "}Fetched from official pricing.
        </p>

        <div className="overflow-x-auto rounded-lg border border-[#2a2d3a]">
          <table className="w-full text-xs font-display">
            <thead>
              <tr className="bg-[#12141c] text-gray-400 uppercase tracking-wider text-[10px]">
                <th className="text-left px-3 py-2.5">Model</th>
                <th className="text-right px-3 py-2.5">Input Token Limit</th>
                <th className="text-right px-3 py-2.5">Output Token Limit</th>
                <th className="text-right px-3 py-2.5">Cost / 1M Tokens</th>
                <th className="text-right px-3 py-2.5">Cost / 1L Chars (In+Out)</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m) => (
                <tr
                  key={m.id}
                  className={`border-t border-[#2a2d3a] ${m.id === selectedModel ? "bg-cyan-500/10" : ""}`}
                >
                  <td className="px-3 py-2.5 text-gray-200">
                    <div className="flex items-center gap-2">
                      <span>{m.label}</span>
                      {m.badge && (
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${accentBadgeClassName}`}>
                          {m.badge}
                        </span>
                      )}
                      {m.id === selectedModel && (
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${selectedBadgeClassName}`}>
                          Selected
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{m.id}</div>
                  </td>
                  <td className="px-3 py-2.5 text-right text-gray-300 tabular-nums">
                    {m.inputTokenLimit.toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 text-right text-gray-300 tabular-nums">
                    {m.outputTokenLimit.toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 text-right text-gray-300 tabular-nums">
                    {m.pricing ? (
                      <>
                        <div>In {formatUsd(m.pricing.inputPer1M)} / {formatInr(m.pricing.inputPer1M)}</div>
                        <div>Out {formatUsd(m.pricing.outputPer1M)} / {formatInr(m.pricing.outputPer1M)}</div>
                      </>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right text-gray-300 tabular-nums">
                    {m.pricing ? (
                      <>{formatUsd(costPerLakhChars(m.pricing))} / {formatInr(costPerLakhChars(m.pricing))}</>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
