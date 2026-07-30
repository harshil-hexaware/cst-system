'use strict';

/**
 * Auto-assignment strategy: pick the active agent with the lowest
 * current open-ticket workload. Pure function — the caller supplies
 * the candidate list (already filtered to active AGENT users) and
 * gets back the chosen agentId or null if none are available.
 *
 * @param {{ id: string, workloadCount: number, isActive: boolean }[]} agents
 * @returns {string|null}
 */
function pickLeastLoadedAgent(agents) {
  const eligible = (agents || []).filter((a) => a.isActive);
  if (eligible.length === 0) return null;
  return eligible.reduce((best, current) => (
    current.workloadCount < best.workloadCount ? current : best
  )).id;
}

module.exports = { pickLeastLoadedAgent };
