import { MessagesService } from '../../src/modules/messages/messages.service';
import prisma from '../../src/config/database';

describe('Messaging Permissions Unit Tests (canMessage)', () => {
  let messagesService: MessagesService;

  beforeAll(() => {
    messagesService = new MessagesService();
  });

  it('should reject messaging oneself', async () => {
    const result = await messagesService.canMessage('same-user-id', 'same-user-id');
    expect(result).toBe(false);
  });

  it('should reject messaging non-existent users', async () => {
    const result = await messagesService.canMessage('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');
    expect(result).toBe(false);
  });
});
