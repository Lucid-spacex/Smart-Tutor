import prisma from '../../config/database';
import { CreateMessageInput } from './messages.validation';
import crypto from 'crypto';
import { logger } from '../../config/logger';
import { AppError } from '../../middleware/error-handler.middleware';

export class MessagesService {
  /**
   * Evaluates whether sender is permitted to message recipient.
   * Strictly enforced permission matrix:
   * 1. Student <-> Assigned Tutor (via ACTIVE enrollment where tutor is assigned)
   * 2. Parent <-> Child (via parent-child relationship)
   * 3. Admin <-> Any user
   * All other pairs are rejected (including Parent <-> Tutor).
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

    // Rule 1: Admin can message anyone, and anyone can message admin
    if (senderRole === 'ADMIN' || recipientRole === 'ADMIN') {
      return true;
    }

    // Rule 2: Student <-> assigned Tutor
    if (senderRole === 'STUDENT' && recipientRole === 'TUTOR') {
      // Look up student profile for sender
      const studentProfile = await prisma.student.findUnique({
        where: { userId: senderId },
        select: { id: true },
      });
      if (!studentProfile) return false;

      const activeEnrollment = await prisma.enrollment.findFirst({
        where: {
          studentId: studentProfile.id,
          tutorId: recipientId,
          status: 'ACTIVE',
        },
      });
      return !!activeEnrollment;
    }

    if (senderRole === 'TUTOR' && recipientRole === 'STUDENT') {
      const studentProfile = await prisma.student.findUnique({
        where: { userId: recipientId },
        select: { id: true },
      });
      if (!studentProfile) return false;

      const activeEnrollment = await prisma.enrollment.findFirst({
        where: {
          studentId: studentProfile.id,
          tutorId: senderId,
          status: 'ACTIVE',
        },
      });
      return !!activeEnrollment;
    }

    // Rule 3: Parent <-> Child (parent-child relationship)
    if (senderRole === 'PARENT' && recipientRole === 'STUDENT') {
      const studentProfile = await prisma.student.findUnique({
        where: { userId: recipientId },
        select: { parentId: true },
      });
      if (!studentProfile) return false;
      return studentProfile.parentId === senderId;
    }

    if (senderRole === 'STUDENT' && recipientRole === 'PARENT') {
      const studentProfile = await prisma.student.findUnique({
        where: { userId: senderId },
        select: { parentId: true },
      });
      if (!studentProfile) return false;
      return studentProfile.parentId === recipientId;
    }

    // All other combinations are disallowed (Parent <-> Tutor, Student <-> Student, Tutor <-> Tutor, etc.)
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

      if (sender?.role === 'TUTOR' && recipient?.role === 'STUDENT') {
        errorMessage = 'You can only message students assigned to your active enrollments';
      } else if (sender?.role === 'STUDENT' && recipient?.role === 'TUTOR') {
        errorMessage = 'You can only message tutors assigned to your active enrollments';
      } else if (sender?.role === 'PARENT' && recipient?.role === 'TUTOR') {
        errorMessage = 'Parents cannot message tutors directly. Please contact admin for assistance.';
      } else if (sender?.role === 'TUTOR' && recipient?.role === 'PARENT') {
        errorMessage = 'Tutors cannot message parents directly. Please contact admin for assistance.';
      } else if (sender?.role === 'PARENT' && recipient?.role === 'STUDENT') {
        errorMessage = 'You can only message your own children';
      } else if (sender?.role === 'STUDENT' && recipient?.role === 'PARENT') {
        errorMessage = 'You can only message your own parent';
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
    // Find all messages involving the user
    const messages = await prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { recipientId: userId }],
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
      if (!threadsMap.has(msg.threadId)) {
        threadsMap.set(msg.threadId, {
          threadId: msg.threadId,
          otherParticipant: otherUser,
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
}
