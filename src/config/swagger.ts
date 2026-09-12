import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Smart Tutor API',
      version: '1.0.0',
      description: 'Tutoring platform backend MVP API documentation',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    tags: [
      {
        name: 'Auth',
        description: 'Authentication and user registration',
      },
      {
        name: 'Admin - Pricing',
        description: 'Admin pricing tier management and exchange rate monitoring',
      },
      {
        name: 'Quiz',
        description: 'Timed quiz mode for assignments',
      },
      {
        name: 'Webhooks',
        description: 'External webhook integrations (Zoom, etc.)',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
            },
            message: {
              type: 'string',
            },
          },
        },
      },
    },
  },
  apis: ['./src/modules/**/*.swagger.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
