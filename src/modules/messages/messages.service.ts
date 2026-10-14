import prisma from '../../config/database';
import { CreateMessageInput } from './messages.validation';
import crypto from 'crypto';
import { logger } from '../../config/logger';
import { AppError } from '../../middleware/error-handler.middleware';

export class MessagesService {
  /**
   * Evaluates whether sender is permitted to message recipient.
   * Strictly enforced permission matrix:
   * - Admin can message any parent or tutor
   * - Parent can message admin
   * - Tutor can message admin
   * - Admin can message admin
   * All other pairs are rejected (including Parent ↔ Child, Student with anyone, Parent ↔ Tutor, same-role pairs).
   */
  async canMessage(senderId: string, recipientId: string): Promise<boolean> {
    if (senderId === recipientId) {
      return false;
    }

    const [sender, recipient] = await Promise.all([
      prisma.user.findUnique({
        where: { id: senderId },
        select: { id: true, role: true, status: true },
      }),
      prisma.user.findUnique({
        where: { id: recipientId },
        select: { id: true, role: true, status: true },
      }),
    ]);

    if (!sender || !recipient) {
      return false;
    }

    // Both accounts must be active/approved
    if (sender.status === 'SUSPENDED' || sender.status === 'REJECTED' || sender.status === 'UNVERIFIED') {
      return false;
    }
    if (recipient.status === 'SUSPENDED' || recipient.status === 'REJECTED' || recipient.status === 'UNVERIFIED') {
      return false;
    }
    if (sender.role === 'TUTOR' && sender.status !== 'APPROVED') {
      return false;
    }
    if (recipient.role === 'TUTOR' && recipient.status !== 'APPROVED') {
      return false;
    }

    const senderRole = sender.role;
    const recipientRole = recipient.role;

    // Admin can message anyone (parent, tutor, or admin)
    if (senderRole === 'ADMIN') {
      return true;
    }

    // Parent can message admin
    if (senderRole === 'PARENT' && recipientRole === 'ADMIN') {
      return true;
    }

    // Tutor can message admin
    if (senderRole === 'TUTOR' && recipientRole === 'ADMIN') {
      return true;
    }

    // All other combinations are disallowed
    return false;
  }

  async sendMessage(senderId: string, data: CreateMessageInput) {
    const isAllowed = await this.canMessage(senderId, data.recipientId);
    if (!isAllowed) {
      // Get user roles for better error message
      const [sender, recipient] = await Promise.all([
        prisma.user.findUnique({
          where: { id: senderId },
          select: { role: true },
        }),
        prisma.user.findUnique({
          where: { id: data.recipientId },
          select: { role: true },
        }),
      ]);

      let errorMessage = 'You are not permitted to message this user';

      // Type cast to allow comparison with all possible roles including STUDENT
      const senderRole = sender?.role as any;
      const recipientRole = recipient?.role as any;

      if (senderRole === 'STUDENT') {
        errorMessage = 'Students are not permitted to send messages';
      } else if (recipientRole === 'STUDENT') {
        errorMessage = 'Messaging students is not permitted';
      } else if (senderRole === 'PARENT' && recipientRole === 'PARENT') {
        errorMessage = 'You cannot message other parents';
      } else if (senderRole === 'TUTOR' && recipientRole === 'TUTOR') {
        errorMessage = 'You cannot message other tutors';
      } else if (senderRole === 'PARENT' && recipientRole === 'TUTOR') {
        errorMessage = 'Parents cannot message tutors directly. Please contact admin for assistance.';
      } else if (senderRole === 'TUTOR' && recipientRole === 'PARENT') {
        errorMessage = 'Tutors cannot message parents directly. Please contact admin for assistance.';
      } else if (senderRole === 'PARENT' && recipientRole === 'STUDENT') {
        errorMessage = 'Parents cannot message students directly. Please contact admin for assistance.';
      } else if (senderRole === 'STUDENT' && recipientRole === 'PARENT') {
        errorMessage = 'Students cannot message anyone. Please contact admin for assistance.';
      }

      throw new AppError(403, errorMessage);
    }

    // Look for existing thread between these two users
    const existingMessage = await prisma.message.findFirst({
      where: {
        OR: [
          { senderId, recipientId: data.recipientId },
          { senderId: data.recipientId, recipientId: senderId },
        ],
      },
      select: { threadId: true },
    });

    const threadId = existingMessage?.threadId || crypto.randomUUID();

    const message = await prisma.message.create({
      data: {
        senderId,
        recipientId: data.recipientId,
        threadId,
        body: data.body,
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            role: true,
          },
        },
        recipient: {
          select: {
            id: true,
            fullName: true,
            role: true,
          },
        },
      },
    });

    logger.info({ senderId, recipientId: data.recipientId, threadId }, 'Message sent successfully');
    return message;
  }

  async getThreads(userId: string) {
    // Get user's role to determine shared admin inbox behavior
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    let whereClause: any;

    // Shared admin inbox: admins see all threads with parents and tutors
    if (user.role === 'ADMIN') {
      // Get all thread IDs where the other participant is a parent or tutor
      const adminThreadIds = await prisma.message.findMany({
        where: {
          OR: [
            { senderId: userId, recipient: { role: { in: ['PARENT', 'TUTOR'] } } },
            { recipientId: userId, sender: { role: { in: ['PARENT', 'TUTOR'] } } },
          ],
        },
        select: { threadId: true },
        distinct: ['threadId'],
      });

      const threadIds = adminThreadIds.map(m => m.threadId);

      whereClause = {
        threadId: { in: threadIds },
      };
    } else {
      // Non-admin users: only see their own threads
      whereClause = {
        OR: [{ senderId: userId }, { recipientId: userId }],
      };
    }

    // Find all messages based on the where clause
    const messages = await prisma.message.findMany({
      where: whereClause,
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            role: true,
          },
        },
        recipient: {
          select: {
            id: true,
            fullName: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group messages by threadId
    const threadsMap = new Map<string, {
      threadId: string;
      otherParticipant: { id: string; fullName: string; role: string };
      lastMessage: {
        id: string;
        body: string;
        createdAt: Date;
        senderId: string;
        readAt: Date | null;
      };
      unreadCount: number;
    }>();

    for (const msg of messages) {
      const otherUser = msg.senderId === userId ? msg.recipient : msg.sender;
      
      // For admins, normalize the other participant display to "Admin" if it's another admin
      let displayParticipant = otherUser;
      if (user.role === 'ADMIN' && otherUser.role === 'ADMIN') {
        // Admin-to-admin threads show as "Admin" consistently
        displayParticipant = { ...otherUser, fullName: 'Admin' };
      }
      
      if (!threadsMap.has(msg.threadId)) {
        threadsMap.set(msg.threadId, {
          threadId: msg.threadId,
          otherParticipant: displayParticipant,
          lastMessage: {
            id: msg.id,
            body: msg.body,
            createdAt: msg.createdAt,
            senderId: msg.senderId,
            readAt: msg.readAt,
          },
          unreadCount: 0,
        });
      }

      if (msg.recipientId === userId && !msg.readAt) {
        const thread = threadsMap.get(msg.threadId)!;
        thread.unreadCount += 1;
      }
    }

    return Array.from(threadsMap.values());
  }

  async getThreadMessages(threadId: string, userId: string) {
    // Check if user is a participant in the thread
    const participantCheck = await prisma.message.findFirst({
      where: {
        threadId,
        OR: [{ senderId: userId }, { recipientId: userId }],
      },
    });

    if (!participantCheck) {
      throw new Error('Access denied to this message thread');
    }

    return prisma.message.findMany({
      where: { threadId },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            role: true,
          },
        },
        recipient: {
          select: {
            id: true,
            fullName: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async markThreadAsRead(threadId: string, userId: string) {
    // Verify participation
    const participantCheck = await prisma.message.findFirst({
      where: {
        threadId,
        OR: [{ senderId: userId }, { recipientId: userId }],
      },
    });

    if (!participantCheck) {
      throw new Error('Access denied to this message thread');
    }

    await prisma.message.updateMany({
      where: {
        threadId,
        recipientId: userId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return { message: 'Messages marked as read' };
  }

  async getAdminContact() {
    // Get an active admin user for parents and tutors to message
    const admin = await prisma.user.findFirst({
      where: {
        role: 'ADMIN',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        fullName: true,
      },
    });

    if (!admin) {
      throw new AppError(404, 'No active admin user found');
    }

    return {
      recipientId: admin.id,
    };
  }
}
