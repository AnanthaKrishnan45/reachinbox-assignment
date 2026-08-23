import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { emailQueue } from "../queue/emailQueue";

const router = Router();

const scheduleSchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
  recipients: z.array(z.string().email()).min(1),
  startTime: z.string().datetime(),
  delaySeconds: z.number().int().min(0).default(2),
  hourlyLimit: z.number().int().positive().default(200),
});

/**
 * Schedule a new email campaign
 */
router.post("/schedule", async (req, res) => {
  try {
    const data = scheduleSchema.parse(req.body);

    const startTime = new Date(data.startTime);

    if (startTime <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Start time must be in the future",
      });
    }

    // Temporary demo user until Google OAuth is implemented.
    const user = await prisma.user.upsert({
      where: {
        googleId: "demo-user",
      },
      update: {},
      create: {
        googleId: "demo-user",
        name: "Demo User",
        email: "demo@reachinbox.local",
      },
    });

    const campaign = await prisma.emailCampaign.create({
      data: {
        userId: user.id,
        subject: data.subject,
        body: data.body,
        startTime,
        delaySeconds: data.delaySeconds,
        hourlyLimit: data.hourlyLimit,
      },
    });

   const jobs = [];

const hourlyLimit =
  data.hourlyLimit ||
  Number(process.env.MAX_EMAILS_PER_HOUR) ||
  200;

for (let i = 0; i < data.recipients.length; i++) {
  const recipient = data.recipients[i];

  const hourIndex = Math.floor(i / hourlyLimit);
  const indexWithinHour = i % hourlyLimit;

  const scheduledAt = new Date(
    startTime.getTime() +
      hourIndex * 60 * 60 * 1000 +
      indexWithinHour * data.delaySeconds * 1000
  );

  const emailJob = await prisma.emailJob.create({
    data: {
      campaignId: campaign.id,
      recipient,
      subject: data.subject,
      body: data.body,
      scheduledAt,
      status: "SCHEDULED",
    },
  });

  const delay = Math.max(0, scheduledAt.getTime() - Date.now());

  const bullJob = await emailQueue.add(
    "send-email",
    {
      emailJobId: emailJob.id,
      recipient,
      subject: data.subject,
      body: data.body,
    },
    {
      delay,
      jobId: emailJob.id,
    }
  );

  await prisma.emailJob.update({
    where: {
      id: emailJob.id,
    },
    data: {
      bullJobId: bullJob.id,
    },
  });

  jobs.push({
    id: emailJob.id,
    recipient,
    scheduledAt,
  });
}
    return res.status(201).json({
      success: true,
      campaignId: campaign.id,
      scheduledCount: jobs.length,
      jobs,
    });
  } catch (error) {
    console.error(error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid request",
        errors: error.issues,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to schedule emails",
    });
  }
});
export default router;
router.get("/stats", async (_req, res) => {
  try {
    const [scheduled, sent, failed] = await Promise.all([
      prisma.emailJob.count({
        where: { status: "SCHEDULED" },
      }),
      prisma.emailJob.count({
        where: { status: "SENT" },
      }),
      prisma.emailJob.count({
        where: { status: "FAILED" },
      }),
    ]);

    res.json({
      success: true,
      scheduled,
      sent,
      failed,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch email statistics",
    });
  }
});

router.get("/scheduled", async (_req, res) => {
  try {
    const jobs = await prisma.emailJob.findMany({
      where: {
        status: "SCHEDULED",
      },
      orderBy: {
        scheduledAt: "asc",
      },
      take: 100,
      select: {
        id: true,
        recipient: true,
        subject: true,
        scheduledAt: true,
        status: true,
        campaignId: true,
      },
    });

    res.json({
      success: true,
      jobs,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch scheduled emails",
    });
  }
});

router.get("/sent", async (_req, res) => {
  try {
    const jobs = await prisma.emailJob.findMany({
      where: {
        status: "SENT",
      },
      orderBy: {
        sentAt: "desc",
      },
      take: 100,
      select: {
        id: true,
        recipient: true,
        subject: true,
        sentAt: true,
        status: true,
        previewUrl: true,
        messageId: true,
        campaignId: true,
      },
    });

    res.json({
      success: true,
      jobs,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch sent emails",
    });
  }
});