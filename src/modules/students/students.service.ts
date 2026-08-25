import prisma from '../../config/database';
import { CreateStudentInput } from './students.validation';

export class StudentsService {
  async createStudent(parentId: string, data: CreateStudentInput) {
    return prisma.student.create({
      data: {
        parentId,
        fullName: data.fullName,
        dateOfBirth: new Date(data.dateOfBirth),
        gradeLevel: data.gradeLevel,
        school: data.school,
        notes: data.notes,
      },
    });
  }

  async getStudentsByParent(parentId: string) {
    return prisma.student.findMany({
      where: { parentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStudentById(id: string, parentId: string) {
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        enrollments: {
          include: {
            subject: true,
            tutor: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!student) {
      throw new Error('Student not found');
    }

    if (student.parentId !== parentId) {
      throw new Error('Not authorized to access this student');
    }

    return student;
  }
}
