const fs = require('fs');
const path = require('path');

const CAMPAIGNS_FILE = path.join(__dirname, 'data', 'campaigns.json');
const SCHEDULES_FILE = path.join(__dirname, 'data', 'schedules.json');
const SOCIAL_CONNECTIONS_FILE = path.join(__dirname, 'data', 'social-connections.json');
const SOCIAL_POSTS_FILE = path.join(__dirname, 'data', 'social-posts.json');

const DEFAULT_SOCIAL_CONNECTIONS = [
  { id: 'instagram', name: 'Instagram', handle: '@franchiseops', connected: true, followers: 12480, color: 'from-fuchsia-500 to-pink-500' },
  { id: 'facebook', name: 'Facebook', handle: 'FranchiseOps India', connected: true, followers: 8930, color: 'from-blue-600 to-blue-500' },
  { id: 'linkedin', name: 'LinkedIn', handle: 'FranchiseOps', connected: false, followers: 0, color: 'from-sky-700 to-sky-500' },
  { id: 'google', name: 'Google Business', handle: 'All outlet profiles', connected: true, followers: 0, color: 'from-amber-500 to-red-500' }
];

function ensureDataDir() {
  const dir = path.dirname(CAMPAIGNS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(CAMPAIGNS_FILE)) fs.writeFileSync(CAMPAIGNS_FILE, JSON.stringify([]));
  if (!fs.existsSync(SCHEDULES_FILE)) fs.writeFileSync(SCHEDULES_FILE, JSON.stringify([]));
  if (!fs.existsSync(SOCIAL_CONNECTIONS_FILE)) fs.writeFileSync(SOCIAL_CONNECTIONS_FILE, JSON.stringify(DEFAULT_SOCIAL_CONNECTIONS, null, 2));
  if (!fs.existsSync(SOCIAL_POSTS_FILE)) fs.writeFileSync(SOCIAL_POSTS_FILE, JSON.stringify([]));
}

function loadCampaigns() {
  ensureDataDir();
  try {
    return JSON.parse(fs.readFileSync(CAMPAIGNS_FILE, 'utf8')) || [];
  } catch (e) {
    return [];
  }
}

function saveCampaigns(arr) {
  ensureDataDir();
  fs.writeFileSync(CAMPAIGNS_FILE, JSON.stringify(arr, null, 2));
}

function loadSchedules() {
  ensureDataDir();
  try {
    return JSON.parse(fs.readFileSync(SCHEDULES_FILE, 'utf8')) || [];
  } catch (e) {
    return [];
  }
}

function saveSchedules(arr) {
  ensureDataDir();
  fs.writeFileSync(SCHEDULES_FILE, JSON.stringify(arr, null, 2));
}

function loadSocialConnections() {
  ensureDataDir();
  try { return JSON.parse(fs.readFileSync(SOCIAL_CONNECTIONS_FILE, 'utf8')) || []; } catch (e) { return DEFAULT_SOCIAL_CONNECTIONS; }
}

function saveSocialConnections(arr) {
  ensureDataDir();
  fs.writeFileSync(SOCIAL_CONNECTIONS_FILE, JSON.stringify(arr, null, 2));
}

function updateSocialConnection(id, connected) {
  const connections = loadSocialConnections();
  const connection = connections.find((item) => item.id === id);
  if (!connection) return null;
  connection.connected = connected;
  saveSocialConnections(connections);
  return connection;
}

function createSocialPost({ message, channels, scheduledFor, campaignId }) {
  ensureDataDir();
  const posts = (() => { try { return JSON.parse(fs.readFileSync(SOCIAL_POSTS_FILE, 'utf8')) || []; } catch (e) { return []; } })();
  const post = { id: posts.length ? Math.max(...posts.map((item) => item.id)) + 1 : 1, message, channels, scheduledFor: scheduledFor || null, campaignId: campaignId || null, status: scheduledFor ? 'scheduled' : 'published', createdAt: new Date().toISOString() };
  posts.push(post);
  fs.writeFileSync(SOCIAL_POSTS_FILE, JSON.stringify(posts, null, 2));
  return post;
}

/**
 * Compute campaign performance and ROI using sales data.
 * - campaign: { id, name, startDate, endDate, cost, outletIds?, channels? }
 * - prisma: instance of PrismaClient
 */
async function computeCampaignMetrics(prisma, campaign) {
  const start = campaign.startDate;
  const end = campaign.endDate;
  // fetch sales during campaign
  const whereDuring = { sale_date: { gte: start, lte: end } };
  if (campaign.outletIds && campaign.outletIds.length > 0) whereDuring.outlet_id = { in: campaign.outletIds };
  const during = await prisma.sales.findMany({ where: whereDuring });
  const revenueDuring = during.reduce((s, r) => s + r.gross_revenue, 0);

  // baseline: same length window immediately before campaign
  const sDate = new Date(start);
  const eDate = new Date(end);
  const days = Math.max(1, Math.round((eDate - sDate) / (1000 * 60 * 60 * 24)) + 1);
  const baselineEnd = new Date(sDate);
  baselineEnd.setDate(baselineEnd.getDate() - 1);
  const baselineStart = new Date(baselineEnd);
  baselineStart.setDate(baselineEnd.getDate() - (days - 1));
  const bStartStr = baselineStart.toISOString().slice(0, 10);
  const bEndStr = baselineEnd.toISOString().slice(0, 10);

  const whereBefore = { sale_date: { gte: bStartStr, lte: bEndStr } };
  if (campaign.outletIds && campaign.outletIds.length > 0) whereBefore.outlet_id = { in: campaign.outletIds };
  const before = await prisma.sales.findMany({ where: whereBefore });
  const revenueBefore = before.reduce((s, r) => s + r.gross_revenue, 0);

  const measuredIncremental = revenueDuring - revenueBefore;
  // Demo campaigns can include revenue attributed by the campaign platform.
  // This is more representative of marketing ROI than a simple comparison of
  // two naturally variable sales periods.
  const attributedRevenue = Number(campaign.attributedRevenue);
  const incremental = Number.isFinite(attributedRevenue) && attributedRevenue > 0
    ? attributedRevenue
    : measuredIncremental;
  const cost = campaign.cost || 0;
  const roi = cost > 0 ? (incremental - cost) / cost : null;

  // simple conversion and uplift metrics
  const upliftPercent = revenueBefore > 0 ? (incremental / revenueBefore) * 100 : null;

  return {
    campaignId: campaign.id,
    name: campaign.name,
    period: { start, end },
    revenueDuring: parseFloat(revenueDuring.toFixed(2)),
    revenueBefore: parseFloat(revenueBefore.toFixed(2)),
    incrementalRevenue: parseFloat(incremental.toFixed(2)),
    cost: parseFloat(cost),
    roi: roi === null ? null : parseFloat(roi.toFixed(3)),
    upliftPercent: upliftPercent === null ? null : parseFloat(upliftPercent.toFixed(2)),
    channels: campaign.channels || [],
    channelInsights: computeChannelInsights(campaign, roi, upliftPercent, incremental),
    recommendations: generateRecommendations({ roi, upliftPercent, cost, incremental })
  };
}

async function predictCampaignSuccess(prisma, campaign) {
  const metrics = await computeCampaignMetrics(prisma, campaign);
  const roi = metrics.roi ?? -1;
  const uplift = metrics.upliftPercent ?? 0;
  const channelCount = metrics.channels.length;
  const roiContribution = Math.max(-30, Math.min(35, roi * 22));
  const upliftContribution = Math.max(-12, Math.min(18, uplift * 1.4));
  const channelContribution = Math.min(8, channelCount * 2);
  const score = Math.round(Math.max(5, Math.min(97, 52 + roiContribution + upliftContribution + channelContribution)));
  const predictedOutcome = score >= 75 ? 'Likely successful' : score >= 55 ? 'Promising — monitor closely' : 'At risk';
  const reasons = [];

  if (roi >= 0.5) reasons.push(`Projected ROI of ${(roi * 100).toFixed(1)}% is above the profitability threshold.`);
  else if (roi >= 0) reasons.push(`Projected ROI of ${(roi * 100).toFixed(1)}% is positive but leaves limited margin for variation.`);
  else reasons.push(`Projected ROI of ${(roi * 100).toFixed(1)}% is below break-even and needs a spend or conversion adjustment.`);

  if (uplift >= 5) reasons.push(`Expected sales uplift of ${uplift.toFixed(1)}% indicates meaningful campaign demand.`);
  else if (uplift >= 0) reasons.push(`Expected sales uplift of ${uplift.toFixed(1)}% is modest; test creative and audience targeting.`);
  else reasons.push(`The baseline comparison indicates a ${Math.abs(uplift).toFixed(1)}% decline, which is a risk signal.`);

  if (channelCount >= 3) reasons.push(`${channelCount} channels provide diversified reach and reduce dependence on one placement.`);
  else reasons.push(`Only ${channelCount} channel${channelCount === 1 ? '' : 's'} is active; broaden reach after validating the current creative.`);

  return { campaignId: campaign.id, campaignName: campaign.name, score, predictedOutcome, reasons, metrics };
}

function computeChannelInsights(campaign, roi, upliftPercent, incremental) {
  const channels = campaign.channels || [];
  if (!channels.length) return [];

  const baseScore = roi !== null ? Math.max(0, Math.min(100, (roi + 0.5) * 50)) : 50;
  return channels.map((channel) => {
    const normalized = channel.toLowerCase();
    const channelFactor =
      normalized.includes("google") ? 1.1 :
      normalized.includes("facebook") ? 1.0 :
      normalized.includes("instagram") ? 0.95 :
      normalized.includes("email") ? 0.85 :
      normalized.includes("sms") ? 0.8 :
      0.9;

    const score = Math.round(baseScore * channelFactor);
    return {
      channel,
      budgetShare: parseFloat((campaign.cost / channels.length).toFixed(2)),
      roiScore: Math.min(100, Math.max(0, score)),
      recommendation:
        score >= 70
          ? "Invest more budget in this channel."
          : score >= 50
          ? "Maintain current spend and optimize creative."
          : "Reduce spend and test a different channel." 
    };
  });
}

function generateRecommendations({ roi, upliftPercent, cost, incremental }) {
  const recs = [];
  if (roi === null) {
    recs.push('Cost data missing — provide campaign `cost` to compute ROI.');
  } else if (roi < -0.2) {
    recs.push('Campaign is not profitable — pause or rework creative and targeting.');
  } else if (roi < 0) {
    recs.push('Break-even not achieved yet — consider reducing spend or optimizing channels.');
  } else if (roi < 0.5) {
    recs.push('Low ROI — run A/B tests on creatives and landing pages to improve conversion.');
  } else {
    recs.push('Healthy ROI — consider scaling budget and doubling down on top channels.');
  }

  if (upliftPercent !== null && upliftPercent < 5) {
    recs.push('Low uplift vs baseline — target more relevant customer segments or improve promotion incentives.');
  }
  if (incremental > 0 && cost > 0 && roi !== null && roi > 0.5) {
    recs.push('Recommend increasing budget by 20% and monitor diminishing returns.');
  }

  // generic suggestions
  recs.push('Run time-of-day and day-of-week analysis to optimize scheduling.');
  recs.push('Use creative A/B testing and measure lift per variant.');
  recs.push('Track channel-level cost (CPC/CPM) and optimize for lowest CAC with positive LTV.');

  return recs;
}

function createSchedule(campaignId, frequency, nextRun) {
  const schedules = loadSchedules();
  const nextId = schedules.length > 0 ? Math.max(...schedules.map((s) => s.id)) + 1 : 1;
  const schedule = {
    id: nextId,
    campaignId,
    frequency,
    nextRun,
    createdAt: new Date().toISOString()
  };
  schedules.push(schedule);
  saveSchedules(schedules);
  return schedule;
}

module.exports = { loadCampaigns, saveCampaigns, computeCampaignMetrics, predictCampaignSuccess, loadSchedules, createSchedule, loadSocialConnections, updateSocialConnection, createSocialPost };
