const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/authMiddleware');

function runPythonTask(task, data) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '..', 'ai', 'marketing_ai.py');
    let tmpFile = null;
    let args = [scriptPath, task];
    
    if (data) {
      tmpFile = path.join(os.tmpdir(), `ai_input_${crypto.randomBytes(4).toString('hex')}.json`);
      fs.writeFileSync(tmpFile, JSON.stringify(data));
      args.push(tmpFile);
    }
    
    let pythonCmd = 'python';
    if (process.platform === 'win32') {
      const userProfile = process.env.USERPROFILE || '';
      const localAppData = process.env.LOCALAPPDATA || '';
      const anacondaPath = path.join(userProfile, 'anaconda3', 'python.exe');
      const pgFilesPath = 'C:\\Program Files\\Python312\\python.exe';
      const pgFilesPathBase = 'C:\\Program Files\\Python312-32\\python.exe';

      if (fs.existsSync(anacondaPath)) {
        pythonCmd = anacondaPath;
      } else if (fs.existsSync(pgFilesPath)) {
        pythonCmd = pgFilesPath;
      } else if (fs.existsSync(pgFilesPathBase)) {
        pythonCmd = pgFilesPathBase;
      } else if (localAppData) {
        const pythonLocalDir = path.join(localAppData, 'Programs', 'Python');
        if (fs.existsSync(pythonLocalDir)) {
          try {
            const subdirs = fs.readdirSync(pythonLocalDir);
            for (const dir of subdirs) {
              const p = path.join(pythonLocalDir, dir, 'python.exe');
              if (fs.existsSync(p)) {
                pythonCmd = p;
                break;
              }
            }
          } catch (e) {}
        }
      }
    }
    
    const pythonProcess = spawn(pythonCmd, args);

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    pythonProcess.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    pythonProcess.on('error', (err) => {
      console.error(`Failed to start Python process for task "${task}":`, err);
      if (tmpFile) {
        try { fs.unlinkSync(tmpFile); } catch (e) {}
      }
      reject(new Error(`Failed to start Python process: ${err.message}`));
    });

    pythonProcess.on('close', (code) => {
      if (tmpFile) {
        try { fs.unlinkSync(tmpFile); } catch (e) {}
      }
      if (code !== 0) {
        console.error(`Python task "${task}" failed. Stderr:`, stderr);
        return reject(new Error(stderr || `Python exited with code ${code}`));
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (err) {
        reject(new Error(`Failed to parse Python JSON output: ${stdout}. Stderr: ${stderr}`));
      }
    });
  });
}

router.get('/kpis', authenticateToken, async (req, res) => {
  try {
    const [campaigns, roiReports, customersList, metrics] = await Promise.all([
      prisma.campaigns.findMany(),
      prisma.roi_reports.findMany(),
      prisma.customers.findMany(),
      prisma.marketing_metrics.findMany()
    ]);

    const totalSpend = roiReports.reduce((s, r) => s + r.total_spend, 0);
    const attributedRevenue = roiReports.reduce((s, r) => s + r.attributed_revenue, 0);
    const netRoi = attributedRevenue - totalSpend;
    const roas = totalSpend > 0 ? parseFloat((attributedRevenue / totalSpend).toFixed(2)) : 0;

    let totalClicks = 0;
    let totalImpressions = 0;
    let totalConversions = 0;
    metrics.forEach(m => {
      totalClicks += m.clicks;
      totalImpressions += m.impressions;
      totalConversions += m.pos_sales_conversions;
    });

    const averageCtr = totalImpressions > 0 ? parseFloat(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;
    const averageConvRate = totalClicks > 0 ? parseFloat(((totalConversions / totalClicks) * 100).toFixed(2)) : 0;

    const sumEngagement = customersList.reduce((s, c) => s + c.calculated_engagement_score, 0);
    const engagementIndex = customersList.length > 0 ? parseFloat((sumEngagement / customersList.length).toFixed(1)) : 50;

    res.json({
      totalSpend,
      attributedRevenue,
      netRoi,
      roas,
      averageCtr,
      averageConvRate,
      engagementIndex,
      totalCustomers: customersList.length
    });
  } catch (error) {
    console.error('Error fetching marketing KPIs:', error);
    res.status(500).json({ error: 'Server error computing marketing KPIs' });
  }
});

router.get('/campaigns', authenticateToken, async (req, res) => {
  try {
    const list = await prisma.campaigns.findMany({
      include: {
        roi_reports: true,
        marketing_metrics: {
          orderBy: { recorded_date: 'asc' }
        }
      },
      orderBy: { id: 'desc' }
    });
    res.json(list);
  } catch (error) {
    console.error('Error fetching campaigns list:', error);
    res.status(500).json({ error: 'Server error fetching campaigns' });
  }
});

router.post('/data-ingest', authenticateToken, async (req, res) => {
  try {
    const { campaignId, clicks, impressions, posSalesConversions, sentimentScore, couponRedemptions, recordedDate } = req.body;

    if (!campaignId || !recordedDate) {
      return res.status(400).json({ error: 'campaignId and recordedDate are required' });
    }

    const campaign = await prisma.campaigns.findUnique({ where: { id: parseInt(campaignId, 10) } });
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const metric = await prisma.marketing_metrics.create({
      data: {
        campaign_id: parseInt(campaignId, 10),
        clicks: parseInt(clicks, 10) || 0,
        impressions: parseInt(impressions, 10) || 0,
        pos_sales_conversions: parseInt(posSalesConversions, 10) || 0,
        sentiment_score: parseFloat(sentimentScore) || 0.0,
        coupon_redemptions: parseInt(couponRedemptions, 10) || 0,
        recorded_date: recordedDate
      }
    });

    const allMetrics = await prisma.marketing_metrics.findMany({ where: { campaign_id: parseInt(campaignId, 10) } });
    let totalConversions = 0;
    allMetrics.forEach(m => {
      totalConversions += m.pos_sales_conversions;
    });

    const avgAOV = campaign.channel === "POS Coupons" ? 220 : 310;
    const attributed_revenue = parseFloat((totalConversions * avgAOV).toFixed(2));
    const total_spend = campaign.budget;
    const net_roi = parseFloat((attributed_revenue - total_spend).toFixed(2));
    const efficiency_ratio = total_spend > 0 ? parseFloat((attributed_revenue / total_spend).toFixed(2)) : 0;

    await prisma.roi_reports.deleteMany({ where: { campaign_id: parseInt(campaignId, 10) } });
    const roiReport = await prisma.roi_reports.create({
      data: {
        campaign_id: parseInt(campaignId, 10),
        total_spend,
        attributed_revenue,
        net_roi,
        efficiency_ratio,
        calculated_timestamp: new Date()
      }
    });

    res.json({ message: 'Metric ingested successfully and ROI recalculated', metric, roiReport });
  } catch (error) {
    console.error('Error in marketing data ingestion:', error);
    res.status(500).json({ error: 'Server error ingesting marketing data' });
  }
});

router.post('/ai/predict', authenticateToken, async (req, res) => {
  try {
    const { budget, channel } = req.body;
    if (!budget || !channel) {
      return res.status(400).json({ error: 'budget and channel are required' });
    }

    const campaignsList = await prisma.campaigns.findMany({
      include: { marketing_metrics: true }
    });

    const historical = campaignsList.map(c => {
      const clicks = c.marketing_metrics.reduce((s, m) => s + m.clicks, 0);
      const impressions = c.marketing_metrics.reduce((s, m) => s + m.impressions, 0);
      const pos_sales_conversions = c.marketing_metrics.reduce((s, m) => s + m.pos_sales_conversions, 0);
      return {
        channel: c.channel,
        budget: c.budget,
        clicks,
        impressions,
        pos_sales_conversions
      };
    });

    const prediction = await runPythonTask('predict', {
      campaign: { budget, channel },
      historical_campaigns: historical
    });

    res.json(prediction);
  } catch (error) {
    console.error('Error running campaign prediction:', error);
    res.status(500).json({ error: 'Server error running AI predictor' });
  }
});

router.get('/ai/segmentation', authenticateToken, async (req, res) => {
  try {
    const customers = await prisma.customers.findMany();
    const result = await runPythonTask('segmentation', { customers });

    if (result && result.customers) {
      for (const c of result.customers) {
        await prisma.customers.update({
          where: { id: c.id },
          data: { segment: c.segment }
        }).catch(err => console.error(`Error updating customer ${c.id}:`, err));
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Error running customer segmentation:', error);
    res.status(500).json({ error: 'Server error running AI segmentation' });
  }
});

router.get('/ai/sentiment', authenticateToken, async (req, res) => {
  try {
    const feedbackComments = [
      { id: 1, text: "The Indiranagar outlet is fantastic! Best espresso in town." },
      { id: 2, text: "I love the butter croissants, but the queue during peak morning hours is too long." },
      { id: 3, text: "Waiters were quite slow, and tables in the Anna Nagar cafe were sticky." },
      { id: 4, text: "Double point Wednesdays is an awesome reward program! Really love the vibes." },
      { id: 5, text: "Overpriced coffee and rude staff in Pune bistro." },
      { id: 6, text: "Tried the new Organic Cold Brew, it tasted very fresh and delicious." },
      { id: 7, text: "My coffee was served cold, highly disappointed." },
      { id: 8, text: "Super cozy atmosphere at Bandra. The espresso barista is highly skilled." }
    ];

    const sentimentResult = await runPythonTask('sentiment', { comments: feedbackComments });
    res.json(sentimentResult);
  } catch (error) {
    console.error('Error running sentiment analysis:', error);
    res.status(500).json({ error: 'Server error running sentiment analyzer' });
  }
});

router.get('/ai/forecast', authenticateToken, async (req, res) => {
  try {
    const metrics = await prisma.marketing_metrics.findMany({
      orderBy: { recorded_date: 'asc' }
    });

    const dailyMap = {};
    metrics.forEach(m => {
      if (!dailyMap[m.recorded_date]) {
        dailyMap[m.recorded_date] = 0;
      }
      dailyMap[m.recorded_date] += m.pos_sales_conversions;
    });

    const dailyMetrics = Object.keys(dailyMap).map(date => ({
      recorded_date: date,
      pos_sales_conversions: dailyMap[date]
    }));

    const forecast = await runPythonTask('forecast', { daily_metrics: dailyMetrics });
    res.json(forecast);
  } catch (error) {
    console.error('Error running trend forecasting:', error);
    res.status(500).json({ error: 'Server error running AI forecasting' });
  }
});

router.get('/ai/recommendations', authenticateToken, async (req, res) => {
  try {
    const campaigns = await prisma.campaigns.findMany({
      include: { roi_reports: true }
    });

    const campaignsData = campaigns.map(c => {
      const rep = c.roi_reports[0] || { total_spend: c.budget, attributed_revenue: 0 };
      return {
        id: c.id,
        name: c.name,
        channel: c.channel,
        budget: c.budget,
        attributed_revenue: rep.attributed_revenue
      };
    });

    const recommendations = await runPythonTask('recommendations', { campaigns: campaignsData });
    res.json(recommendations);
  } catch (error) {
    console.error('Error generating AI recommendations:', error);
    res.status(500).json({ error: 'Server error generating recommendations' });
  }
});

router.post('/recommendations/apply', authenticateToken, async (req, res) => {
  try {
    const { reallocation_details, campaign_id } = req.body;

    if (reallocation_details) {
      const { source_channel, target_channel, shift_amount } = reallocation_details;

      const sourceCampaigns = await prisma.campaigns.findMany({ where: { channel: source_channel, status: 'Active' } });
      const targetCampaigns = await prisma.campaigns.findMany({ where: { channel: target_channel, status: 'Active' } });

      if (sourceCampaigns.length > 0 && targetCampaigns.length > 0) {
        const srcCamp = sourceCampaigns[0];
        const tgtCamp = targetCampaigns[0];

        const finalSrcBudget = Math.max(0, srcCamp.budget - shift_amount);
        const finalTgtBudget = tgtCamp.budget + shift_amount;

        await prisma.campaigns.update({
          where: { id: srcCamp.id },
          data: { budget: finalSrcBudget }
        });

        await prisma.campaigns.update({
          where: { id: tgtCamp.id },
          data: { budget: finalTgtBudget }
        });

        const allSrcMetrics = await prisma.marketing_metrics.findMany({ where: { campaign_id: srcCamp.id } });
        const allTgtMetrics = await prisma.marketing_metrics.findMany({ where: { campaign_id: tgtCamp.id } });

        const srcConv = allSrcMetrics.reduce((s, m) => s + m.pos_sales_conversions, 0);
        const tgtConv = allTgtMetrics.reduce((s, m) => s + m.pos_sales_conversions, 0);

        const srcAOV = srcCamp.channel === "POS Coupons" ? 220 : 310;
        const tgtAOV = tgtCamp.channel === "POS Coupons" ? 220 : 310;

        await prisma.roi_reports.deleteMany({ where: { campaign_id: srcCamp.id } });
        await prisma.roi_reports.create({
          data: {
            campaign_id: srcCamp.id,
            total_spend: finalSrcBudget,
            attributed_revenue: srcConv * srcAOV,
            net_roi: (srcConv * srcAOV) - finalSrcBudget,
            efficiency_ratio: finalSrcBudget > 0 ? (srcConv * srcAOV) / finalSrcBudget : 0,
            calculated_timestamp: new Date()
          }
        });

        await prisma.roi_reports.deleteMany({ where: { campaign_id: tgtCamp.id } });
        await prisma.roi_reports.create({
          data: {
            campaign_id: tgtCamp.id,
            total_spend: finalTgtBudget,
            attributed_revenue: tgtConv * tgtAOV,
            net_roi: (tgtConv * tgtAOV) - finalTgtBudget,
            efficiency_ratio: finalTgtBudget > 0 ? (tgtConv * tgtAOV) / finalTgtBudget : 0,
            calculated_timestamp: new Date()
          }
        });

        return res.json({ message: `Successfully reallocated \u20B9${shift_amount} from ${source_channel} to ${target_channel}` });
      }
    } else if (campaign_id) {
      return res.json({ message: `Applied audience targeting refinement for Campaign ID ${campaign_id}` });
    }

    res.status(400).json({ error: 'Invalid reallocation parameters or campaign ID' });
  } catch (error) {
    console.error('Error applying marketing recommendation:', error);
    res.status(500).json({ error: 'Server error applying recommendation' });
  }
});

module.exports = router;
