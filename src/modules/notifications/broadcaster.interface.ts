/**
 * Notification Broadcaster Interface
 * Can be implemented with in-memory storage for single-instance deployment
 * or Redis pub/sub for multi-instance deployment
 */
export interface NotificationBroadcaster {
  /**
   * Broadcast a notification to a specific user
   */
  broadcast(userId: string, notification: any): Promise<void>;

  /**
   * Add a client connection for a user
   */
  addClient(userId: string, clientId: string): void;

  /**
   * Remove a client connection
   */
  removeClient(userId: string, clientId: string): void;

  /**
   * Get number of active connections for a user
   */
  getConnectionCount(userId: string): number;
}

export interface NotificationMessage {
  id: string;
  type: string;
  category: string;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  createdAt: string;
}
