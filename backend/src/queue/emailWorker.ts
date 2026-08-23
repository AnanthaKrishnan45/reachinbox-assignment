import { Worker } from "bullmq";
import { redisConnection } from "../config/redis";
import { prisma } from "../config/prisma";
import { getMailer, nodemailer } from "../config/mailer";
import { EMAIL_QUEUE_NAME } from "./emailQueue";

const concurrency = Number(process.env.WORKER_CONCURRENCY) || 5;
const MIN_DELAY_MS =
  Number(process.env.MIN_DELAY_BETWEEN_EMAILS_MS) || 2000;

const SEND_THROTTLE_KEY = "reachinbox:email:last-send";

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function waitForSendSlot(): Promise<void> {
  while (true) {
    const now = Date.now();

    const waitTime = await redisConnection.eval(
      `
      local last = redis.call("GET", KEYS[1])

      if not last then
        redis.call("SET", KEYS[1], ARGV[1], "PX", ARGV[2])
        return 0
      end

      local elapsed = ARGV[1] - tonumber(last)

      if elapsed >= tonumber(ARGV[3]) then
        redis.call("SET", KEYS[1], ARGV[1], "PX", ARGV[2])
        return 0
      end

      return tonumber(ARGV[3]) - elapsed
      `,
      1,
      SEND_THROTTLE_KEY,
      now,
      MIN_DELAY_MS * 2,
      MIN_DELAY_MS
    );

    const wait = Number(waitTime);

    if (wait <= 0) {
      return;
    }

    console.log(`⏳ Send throttle: waiting ${wait}ms`);
    await sleep(wait);
  }
}
export const emailWorker = new Worker(
  EMAIL_QUEUE_NAME,
  async (job) => {
    const { emailJobId, recipient, subject, body } = job.data;

    console.log(`📨 Processing email job: ${job.id}`);

    const emailJob = await prisma.emailJob.findUnique({
      where: {
        id: emailJobId,
      },
    });

    if (!emailJob) {
      throw new Error(`Email job ${emailJobId} not found`);
    }

    // Idempotency protection.
    // Never send an email that has already been successfully sent.
    if (emailJob.status === "SENT") {
      console.log(`⚠️ Job ${emailJobId} already sent. Skipping.`);
      return {
        skipped: true,
        reason: "already-sent",
      };
    }

    try {
      await prisma.emailJob.update({
        where: {
          id: emailJobId,
        },
        data: {
          status: "PROCESSING",
        },
      });

      await waitForSendSlot();

const transporter = await getMailer();

const info = await transporter.sendMail({
        from: "ReachInbox Test <no-reply@reachinbox.test>",
        to: recipient,
        subject,
        text: body,
        html: `<p>${body.replace(/\n/g, "<br>")}</p>`,
      });

      const previewUrl = nodemailer.getTestMessageUrl(info);

      await prisma.emailJob.update({
        where: {
          id: emailJobId,
        },
        data: {
          status: "SENT",
          sentAt: new Date(),
          messageId: info.messageId,
          previewUrl: previewUrl || null,
        },
      });

      console.log(`✅ Email sent to ${recipient}`);

      if (previewUrl) {
        console.log(`🔗 Preview: ${previewUrl}`);
      }

      return {
        success: true,
        messageId: info.messageId,
        previewUrl,
      };
    } catch (error) {
      await prisma.emailJob.update({
        where: {
          id: emailJobId,
        },
        data: {
          status: "FAILED",
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
        },
      });

      console.error(`❌ Email failed: ${recipient}`, error);

      throw error;
    }
  },
  {
    connection: redisConnection,

    // Configurable parallel workers
    concurrency,

    // Global hourly rate limit
    limiter: {
      max: Number(process.env.MAX_EMAILS_PER_HOUR) || 200,
      duration: 60 * 60 * 1000,
    },
  }
);

emailWorker.on("completed", (job) => {
  console.log(`✅ BullMQ job completed: ${job.id}`);
});

emailWorker.on("failed", (job, error) => {
  console.error(`❌ BullMQ job failed: ${job?.id}`, error.message);
});

emailWorker.on("error", (error) => {
  console.error("❌ Worker error:", error);
});

console.log(
  `🚀 Email worker started | concurrency=${concurrency} | hourlyLimit=${
    Number(process.env.MAX_EMAILS_PER_HOUR) || 200
  }`
);