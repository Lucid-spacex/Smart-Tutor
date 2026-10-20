import { Request, Response } from 'express';
import { AuthRequest } from '../../types/express';
import { notificationBroadcaster } from './in-memory-broadcaster';
import { NotificationCoreService } from './notification-core.service';
import { logger } from '../../config/logger';
import crypto from 'crypto';
import prisma from '../../config/database';

export class NotificationSSEController {
  private notificationService: NotificationCoreService;

  constructor() {
    this.notificationService = new NotificationCoreService();
  }

  /**
   * Generate a single-use stream ticket for EventSource compatibility
   * Expires in 30 seconds
   */
  createStreamTicket = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      // Generate a random ticket
      const ticket = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 30 * 1000); // 30 seconds

      // In production, store this in Redis with expiration
      // For now, we'll use in-memory (not ideal for multi-instance)
      // This is a simplified implementation
      const streamTickets = new Map<string, { userId: string; expiresAt: number }>();
      (global as any).streamTickets = streamTickets;
      streamTickets.set(ticket, { userId, expiresAt: expiresAt.getTime() });

      res.status(200).json({ ticket, expiresAt: expiresAt.toISOString() });
    } catch (error) {
      logger.error({ error }, 'Failed to create stream ticket');
      res.status(500).json({ error: 'Failed to create stream ticket' });
    }
  };

  /**
   * SSE endpoint for real-time notifications
   * Accepts JWT via Authorization header or stream ticket via query param
   * Supports Last-Event-ID replay
   */
  streamNotifications = async (req: Request, res: Response): Promise<void> => {
    try {
      // Check for stream ticket (for EventSource compatibility)
      const ticket = req.query.ticket as string;
      let userId: string | undefined;

      if (ticket) {
        const streamTickets = (global as any).streamTickets as Map<string, { userId: string; expiresAt: number }>;
        if (!streamTickets) {
          res.status(400).json({ error: 'Stream tickets not initialized' });
          return;
        }

        const ticketData = streamTickets.get(ticket);
        if (!ticketData || ticketData.expiresAt < Date.now()) {
          res.status(401).json({ error: 'Invalid or expired stream ticket' });
          return;
        }

        userId = ticketData.userId;
        // Consume the ticket (single-use)
        streamTickets.delete(ticket);
      } else {
        // Use JWT from Authorization header
        const authRequest = req as AuthRequest;
        userId = authRequest.user?.userId;
      }

      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      // Check user status (session could be revoked)
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, status: true },
      });

      if (!user || user.status !== 'ACTIVE') {
        res.status(401).json({ error: 'User not found or inactive' });
        return;
      }

      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      // Generate a client ID
      const clientId = crypto.randomBytes(16).toString('hex');

      try {
        // Register client with broadcaster
        notificationBroadcaster.addClient(userId, clientId);
        notificationBroadcaster.registerResponse(clientId, res);
      } catch (error) {
        res.status(429).json({ error: 'Maximum connections exceeded' });
        return;
      }

      // Send initial comment to establish connection
      res.write(`: connected\n\n`);

      // Check for Last-Event-ID header for replay
      const lastEventId = req.headers['last-event-id'] as string;

      if (lastEventId) {
        // Replay notifications after the last received ID
        const replayNotifications = await this.notificationService.getNotifications(userId, { limit: 50 });
        let startedSending = false;
        for (const notification of replayNotifications.data) {
          if (notification.id === lastEventId) {
            startedSending = true;
            continue; // Skip the last received one
          }
          if (startedSending) {
            res.write(`id: ${notification.id}\n`);
            res.write(`event: notification\n`);
            res.write(`data: ${JSON.stringify(notification)}\n\n`);
          }
        }
      } else {
        // Send any recent notifications
        const recentNotifications = await this.notificationService.getNotifications(userId, { limit: 10 });
        for (const notification of recentNotifications.data) {
          res.write(`id: ${notification.id}\n`);
          res.write(`event: notification\n`);
          res.write(`data: ${JSON.stringify(notification)}\n\n`);
        }
      }

      // Send heartbeat every 25 seconds
      const heartbeatInterval = setInterval(() => {
        res.write(`: heartbeat\n\n`);
      }, 25000);

      // Clean up on client disconnect
      req.on('close', () => {
        clearInterval(heartbeatInterval);
        notificationBroadcaster.removeClient(userId, clientId);
        logger.debug({ userId, clientId }, 'SSE client disconnected');
      });

      req.on('error', (error) => {
        clearInterval(heartbeatInterval);
        notificationBroadcaster.removeClient(userId, clientId);
        logger.error({ error, userId, clientId }, 'SSE client error');
      });

    } catch (error) {
      logger.error({ error }, 'SSE connection failed');
      if (!res.headersSent) {
        res.status(500).json({ error: 'SSE connection failed' });
      }
    }
  };
}
