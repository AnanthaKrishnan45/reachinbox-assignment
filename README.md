# ReachInbox Email Automation

A full-stack email campaign scheduling application built with React, Express, PostgreSQL, Prisma, Redis, and BullMQ.

The application allows users to create email campaigns, schedule emails for future delivery, control the delay between individual emails, enforce hourly sending limits, process emails in the background, and track scheduled, sent, and failed emails.

## Features

- Create and schedule email campaigns
- Multiple recipients per campaign
- One recipient per line or comma-separated recipients
- Configurable start time
- Configurable delay between emails
- Configurable hourly sending limit
- Background email processing with BullMQ
- Redis-backed job queue
- PostgreSQL database with Prisma ORM
- Email delivery using Nodemailer
- Ethereal Email preview links for development/testing
- Automatic retry support through the queue
- Scheduled email tracking
- Sent email tracking
- Failed email tracking
- Dashboard statistics
- Responsive React UI
- Backend connection status
- Automatic dashboard refresh

## Tech Stack

### Frontend

- React
- TypeScript
- Vite
- CSS

### Backend

- Node.js
- Express
- TypeScript
- Prisma
- PostgreSQL
- Redis
- BullMQ
- Nodemailer
- Zod

## Architecture

```text
React Frontend
      |
      | HTTP API
      v
Express Backend
      |
      +--------------------+
      |                    |
      v                    v
 PostgreSQL              Redis
   + Prisma              + BullMQ
                            |
                            v
                       Email Worker
                            |
                            v
                         Nodemailer
                            |
                            v
                    Email Provider