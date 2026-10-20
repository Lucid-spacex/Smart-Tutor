import { NotificationBroadcaster, NotificationMessage } from './broadcaster.interface';
import { logger } from '../../config/logger';
import { Response } from 'express';

/**
 * In-memory implementation of NotificationBroadcaster
 * Suitable for single-instance deployment
 * For multi-instance deployment, implement with Redis pub/sub
 */
class InMemoryNotificationBroadcaster implements NotificationBroadcaster {
  private clients: Map<string, Set<string>> = new Map(); // userId -> Set of clientIds
  private userClients: Map<string, string> = new Map(); // clientId -> userId
  private responseObjects: Map<string, Response> = new Map(); // clientId -> Response object
  private maxConnectionsPerUser = 3;

  async broadcast(userId: string, notification: NotificationMessage): Promise<void> {
    const clientIds = this.clients.get(userId);
    if (!clientIds || clientIds.size === 0) {
      return; // No active connections for this user
    }

    logger.debug({ userId, notificationId: notification.id }, 'Broadcasting notification');

    // Push to all connected clients for this user
    for (const clientId of clientIds) {
      const res = this.responseObjects.get(clientId);
      if (res && !res.headersSent) {
        try {
          res.write(`id: ${notification.id}\n`);
          res.write(`event: notification\n`);
          res.write(`data: ${JSON.stringify(notification)}\n\n`);
        } catch (error) {
          logger.error({ error, clientId }, 'Failed to send SSE message');
          // Remove broken connection
          this.removeClient(userId, clientId);
        }
      }
    }
  }

  addClient(userId: string, clientId: string): void {
    const currentCount = this.getConnectionCount(userId);

    if (currentCount >= this.maxConnectionsPerUser) {
      logger.warn({ userId, clientId, currentCount }, 'Max connections reached for user');
      throw new Error('Maximum connections exceeded');
    }

    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId)!.add(clientId);
    this.userClients.set(clientId, userId);

    logger.debug({ userId, clientId, count: currentCount + 1 }, 'Client added');
  }

  removeClient(userId: string, clientId: string): void {
    const clientIds = this.clients.get(userId);
    if (clientIds) {
      clientIds.delete(clientId);
      if (clientIds.size === 0) {
        this.clients.delete(userId);
      }
    }
    this.userClients.delete(clientId);
    this.responseObjects.delete(clientId);

    logger.debug({ userId, clientId }, 'Client removed');
  }

  /**
   * Register a response object for a client (used by SSE controller)
   */
  registerResponse(clientId: string, res: Response): void {
    this.responseObjects.set(clientId, res);
  }

  getConnectionCount(userId: string): number {
    return this.clients.get(userId)?.size || 0;
  }

  /**
   * Get user ID from client ID
   */
  getUserIdByClient(clientId: string): string | undefined {
    return this.userClients.get(clientId);
  }

  /**
   * Remove all clients for a user (e.g., on session revocation)
   */
  removeAllClientsForUser(userId: string): void {
    const clientIds = this.clients.get(userId);
    if (clientIds) {
      for (const clientId of clientIds) {
        this.userClients.delete(clientId);
        this.responseObjects.delete(clientId);
      }
      this.clients.delete(userId);
      logger.debug({ userId, count: clientIds.size }, 'Removed all clients for user');
    }
  }
}

// Singleton instance
export const notificationBroadcaster = new InMemoryNotificationBroadcaster();
