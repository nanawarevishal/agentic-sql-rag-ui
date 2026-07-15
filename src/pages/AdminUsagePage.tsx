import { useState } from "react";
import { useGetMetricsSummaryQuery } from "../features/admin/adminUsageApi";

function formatMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
}

function formatPercent(fraction: number): string {
  return `${(fraction * 100).toFixed(1)}%`;
}

// Per-query cost is often fractions of a cent - the existing $-formatters in
// lib/format.ts round to 2dp, which would show "$0.00" for most rows here.
function formatCost(usd: number): string {
  return usd < 0.01 ? `$${usd.toFixed(4)}` : `$${usd.toFixed(2)}`;
}

const WINDOW_OPTIONS = [
  { label: "24 hours", days: 1 },
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
];

export function AdminUsagePage() {
  const [sinceDays, setSinceDays] = useState(7);
  const { data, isFetching, isError } = useGetMetricsSummaryQuery({ sinceDays });

  return (
    <div className="admin-page">
      <div className="admin-card">
        <div className="admin-card-header">
          <div>
            <h2>Usage</h2>
            <p>Query volume, latency, and error rate across all users.</p>
          </div>
          <div className="admin-usage-window" role="tablist">
            {WINDOW_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                type="button"
                role="tab"
                aria-selected={sinceDays === opt.days}
                className={sinceDays === opt.days ? "is-active" : ""}
                onClick={() => setSinceDays(opt.days)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="admin-card-body">
          {isFetching && !data ? (
            <div className="loading-banner">
              <span className="dot-pulse" />
              Loading...
            </div>
          ) : isError || !data ? (
            <p className="ds-error">Could not load usage metrics.</p>
          ) : (
            <>
              <div className="admin-usage-stats">
                <div className="admin-usage-stat">
                  <span className="admin-usage-stat-label">Total queries</span>
                  <span className="admin-usage-stat-value">{data.total_queries.toLocaleString()}</span>
                </div>
                <div className="admin-usage-stat">
                  <span className="admin-usage-stat-label">Error rate</span>
                  <span className="admin-usage-stat-value">{formatPercent(data.error_rate)}</span>
                </div>
                <div className="admin-usage-stat">
                  <span className="admin-usage-stat-label">Avg latency</span>
                  <span className="admin-usage-stat-value">{formatMs(data.avg_duration_ms)}</span>
                </div>
                <div className="admin-usage-stat">
                  <span className="admin-usage-stat-label">p50 latency</span>
                  <span className="admin-usage-stat-value">{formatMs(data.p50_duration_ms)}</span>
                </div>
                <div className="admin-usage-stat">
                  <span className="admin-usage-stat-label">p95 latency</span>
                  <span className="admin-usage-stat-value">{formatMs(data.p95_duration_ms)}</span>
                </div>
                <div className="admin-usage-stat">
                  <span className="admin-usage-stat-label">Total cost (est.)</span>
                  <span className="admin-usage-stat-value">{formatCost(data.total_cost_usd)}</span>
                </div>
                <div className="admin-usage-stat">
                  <span className="admin-usage-stat-label">Avg cost / query</span>
                  <span className="admin-usage-stat-value">{formatCost(data.avg_cost_per_query_usd)}</span>
                </div>
              </div>

              <div className="admin-usage-tables">
                <div className="admin-usage-table-block">
                  <h3>Most asked questions</h3>
                  {data.top_questions.length === 0 ? (
                    <p className="trace-detail-note">No queries in this window.</p>
                  ) : (
                    <table className="trace-rows-table admin-usage-table">
                      <thead>
                        <tr>
                          <th>Question</th>
                          <th>Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.top_questions.map((q, i) => (
                          <tr key={i}>
                            <td>{q.question}</td>
                            <td>{q.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="admin-usage-table-block">
                  <h3>Per-user activity</h3>
                  {data.per_user.length === 0 ? (
                    <p className="trace-detail-note">No queries in this window.</p>
                  ) : (
                    <table className="trace-rows-table admin-usage-table">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Queries</th>
                          <th>Errors</th>
                          <th>Cost (est.)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.per_user.map((u) => (
                          <tr key={u.user_id}>
                            <td>{u.email}</td>
                            <td>{u.query_count}</td>
                            <td>{u.error_count}</td>
                            <td>{formatCost(u.cost_usd)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
