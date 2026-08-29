import prisma from '../../config/database';

export class SubjectsService {
  async getSubjects(filters?: { category?: string; gradeBand?: string }) {
    const where: any = {};

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.gradeBand) {
      where.gradeBand = filters.gradeBand;
    }

    return prisma.subject.findMany({
      where,
      select: {
        id: true,
        name: true,
        gradeBand: true,
        category: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }
}
