import swaggerJsdoc from 'swagger-jsdoc';
import fs from 'fs';
import path from 'path';

// Load custom CSS
const customCssPath = path.join(__dirname, 'swagger-custom.css');
const customCss = fs.existsSync(customCssPath) 
  ? fs.readFileSync(customCssPath, 'utf8')
  : '.swagger-ui .topbar { display: none }';

const options = {
  definition: {
    openapi: '3.1.0',
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
        name: 'Parent',
        description: 'Parent profile and account management',
      },
      {
        name: 'Student',
        description: 'Student-facing endpoints for profile, schedule, assignments, grades, and notifications',
      },
      {
        name: 'Students',
        description: 'Parent management of student profiles and activities',
      },
      {
        name: 'Tutor',
        description: 'Tutor profile, availability, and student assignments',
      },
      {
        name: 'Subjects',
        description: 'Available subjects and grade bands',
      },
      {
        name: 'Sessions',
        description: 'Tutoring session management and scheduling',
      },
      {
        name: 'Enrollments',
        description: 'Student enrollment management',
      },
      {
        name: 'Payments',
        description: 'Payment processing and verification',
      },
      {
        name: 'Progress Reports',
        description: 'Student progress reports and assessments',
      },
      {
        name: 'Attendance',
        description: 'Student attendance tracking',
      },
      {
        name: 'Assignments',
        description: 'Assignment creation and management',
      },
      {
        name: 'Grades',
        description: 'Grade recording and approval workflow',
      },
      {
        name: 'Notifications',
        description: 'User notifications and alerts',
      },
      {
        name: 'Complaints',
        description: 'Complaint submission and resolution',
      },
      {
        name: 'Messages',
        description: 'Messaging and communication threads',
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
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            fullName: {
              type: 'string',
            },
            email: {
              type: 'string',
              format: 'email',
            },
            role: {
              type: 'string',
              enum: ['PARENT', 'TUTOR', 'ADMIN'],
            },
            status: {
              type: 'string',
              enum: ['UNVERIFIED', 'ACTIVE', 'PENDING_VETTING', 'APPROVED', 'REJECTED', 'SUSPENDED'],
            },
            timezone: {
              type: 'string',
              nullable: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Student: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            parentId: {
              type: 'string',
              format: 'uuid',
            },
            fullName: {
              type: 'string',
            },
            dateOfBirth: {
              type: 'string',
              format: 'date',
            },
            gradeLevel: {
              type: 'string',
            },
            actualGrade: {
              type: 'string',
              enum: ['PRESCHOOL', 'KINDERGARTEN', 'GRADE_1', 'GRADE_2', 'GRADE_3', 'GRADE_4', 'GRADE_5', 'GRADE_6', 'GRADE_7', 'GRADE_8', 'GRADE_9', 'GRADE_10', 'GRADE_11', 'GRADE_12'],
            },
            gender: {
              type: 'string',
              enum: ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'],
            },
            email: {
              type: 'string',
              format: 'email',
              nullable: true,
            },
            preferredStartDate: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            gradeBandTier: {
              type: 'string',
              enum: ['PRESCHOOL_TO_G1', 'G2_TO_G4', 'G5_TO_G8', 'G9_TO_G12'],
            },
            studentCode: {
              type: 'string',
            },
            school: {
              type: 'string',
              nullable: true,
            },
            notes: {
              type: 'string',
              nullable: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        TutorProfile: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            userId: {
              type: 'string',
              format: 'uuid',
            },
            subjects: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            bio: {
              type: 'string',
            },
            credentialsUrl: {
              type: 'string',
              format: 'uri',
              nullable: true,
            },
            vettingStatus: {
              type: 'string',
              enum: ['PENDING', 'APPROVED', 'REJECTED'],
            },
            hourlyRate: {
              type: 'number',
              format: 'decimal',
            },
            availability: {
              type: 'object',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Subject: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            name: {
              type: 'string',
            },
            gradeBand: {
              type: 'string',
            },
            category: {
              type: 'string',
              enum: ['CORE', 'ENRICHMENT'],
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Session: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            enrollmentId: {
              type: 'string',
              format: 'uuid',
            },
            scheduledAt: {
              type: 'string',
              format: 'date-time',
            },
            durationMinutes: {
              type: 'integer',
            },
            zoomLink: {
              type: 'string',
              nullable: true,
            },
            zoomMeetingId: {
              type: 'string',
              nullable: true,
            },
            recordingUrl: {
              type: 'string',
              nullable: true,
            },
            recordingStatus: {
              type: 'string',
              enum: ['NONE', 'PROCESSING', 'AVAILABLE', 'FAILED'],
            },
            status: {
              type: 'string',
              enum: ['SCHEDULED', 'COMPLETED', 'MISSED', 'CANCELLED'],
            },
            tutorNotes: {
              type: 'string',
              nullable: true,
            },
            homeworkAssigned: {
              type: 'string',
              nullable: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Enrollment: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            enrollmentGroupId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
            },
            studentId: {
              type: 'string',
              format: 'uuid',
            },
            subjectId: {
              type: 'string',
              format: 'uuid',
            },
            tutorId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
            },
            sessionFrequency: {
              type: 'string',
              enum: ['TWICE_WEEKLY', 'THRICE_WEEKLY', 'FIVE_TIMES_WEEKLY'],
            },
            availableDays: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
              },
            },
            preferredStartHour: {
              type: 'integer',
              minimum: 0,
              maximum: 23,
            },
            preferredEndHour: {
              type: 'integer',
              minimum: 0,
              maximum: 23,
            },
            billingFrequency: {
              type: 'string',
              enum: ['WEEKLY', 'MONTHLY', 'YEARLY'],
            },
            status: {
              type: 'string',
              enum: ['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'],
            },
            startDate: {
              type: 'string',
              format: 'date',
            },
            endDate: {
              type: 'string',
              format: 'date',
              nullable: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Payment: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            parentId: {
              type: 'string',
              format: 'uuid',
            },
            enrollmentId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
            },
            enrollmentGroupId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
            },
            amount: {
              type: 'number',
              format: 'decimal',
            },
            currency: {
              type: 'string',
            },
            provider: {
              type: 'string',
              enum: ['PAYSTACK', 'STRIPE'],
            },
            providerReference: {
              type: 'string',
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'],
            },
            paidAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        ProgressReport: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            enrollmentId: {
              type: 'string',
              format: 'uuid',
            },
            period: {
              type: 'string',
            },
            summary: {
              type: 'string',
            },
            strengths: {
              type: 'string',
            },
            areasToImprove: {
              type: 'string',
            },
            createdBy: {
              type: 'string',
              format: 'uuid',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Assignment: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            enrollmentId: {
              type: 'string',
              format: 'uuid',
            },
            title: {
              type: 'string',
            },
            description: {
              type: 'string',
            },
            type: {
              type: 'string',
              enum: ['ASSIGNMENT', 'CLASSWORK', 'TEST'],
            },
            dueDate: {
              type: 'string',
              format: 'date-time',
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'COMPLETED'],
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Grade: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            enrollmentId: {
              type: 'string',
              format: 'uuid',
            },
            assignmentId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
            },
            score: {
              type: 'number',
            },
            comments: {
              type: 'string',
            },
            status: {
              type: 'string',
              enum: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED'],
            },
            visibleToStudent: {
              type: 'boolean',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Notification: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            userId: {
              type: 'string',
              format: 'uuid',
            },
            type: {
              type: 'string',
            },
            title: {
              type: 'string',
            },
            message: {
              type: 'string',
            },
            isRead: {
              type: 'boolean',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Complaint: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            filedBy: {
              type: 'string',
              format: 'uuid',
            },
            aboutType: {
              type: 'string',
              enum: ['STUDENT', 'TUTOR', 'PARENT', 'GENERAL'],
            },
            aboutId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
            },
            subject: {
              type: 'string',
            },
            description: {
              type: 'string',
            },
            status: {
              type: 'string',
              enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED'],
            },
            reply: {
              type: 'string',
              nullable: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
      },
    },
  },
  apis: ['./src/modules/**/*.swagger.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);

export const swaggerUiOptions = {
  explorer: true,
  customCss: customCss,
  customSiteTitle: 'Smart Tutor API Documentation',
  customJs: `
    // Enhanced search functionality
    document.addEventListener('DOMContentLoaded', function() {
      // Add keyboard shortcut for search (Ctrl/Cmd + K)
      document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
          e.preventDefault();
          const searchInput = document.querySelector('.searchbox input');
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
          }
        }
      });

      // Enhanced search highlighting with real-time filtering
      const searchInput = document.querySelector('.searchbox input');
      if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function(e) {
          clearTimeout(searchTimeout);
          searchTimeout = setTimeout(function() {
            const searchTerm = e.target.value.toLowerCase();
            if (searchTerm.length > 0) {
              filterAndHighlightSearchResults(searchTerm);
            } else {
              clearHighlights();
              showAllOperations();
            }
          }, 200);
        });
      }

      function filterAndHighlightSearchResults(searchTerm) {
        clearHighlights();
        const operations = document.querySelectorAll('.opblock');
        let matchCount = 0;
        
        operations.forEach(function(op) {
          const summary = op.querySelector('.opblock-summary');
          const description = op.querySelector('.opblock-summary-description');
          const path = op.querySelector('.opblock-summary-path');
          
          const summaryText = summary ? summary.textContent.toLowerCase() : '';
          const descriptionText = description ? description.textContent.toLowerCase() : '';
          const pathText = path ? path.textContent.toLowerCase() : '';
          
          const matches = summaryText.includes(searchTerm) || 
                         descriptionText.includes(searchTerm) || 
                         pathText.includes(searchTerm);
          
          if (matches) {
            op.classList.add('highlighted');
            op.style.display = 'block';
            matchCount++;
          } else {
            op.style.display = 'none';
          }
        });

        // Update search result count
        updateSearchCount(matchCount, searchTerm);
      }

      function showAllOperations() {
        const operations = document.querySelectorAll('.opblock');
        operations.forEach(function(op) {
          op.style.display = 'block';
        });
        updateSearchCount(0, '');
      }

      function updateSearchCount(count, searchTerm) {
        let countDisplay = document.getElementById('search-count');
        if (!countDisplay) {
          countDisplay = document.createElement('div');
          countDisplay.id = 'search-count';
          countDisplay.style.cssText = 'padding: 8px 16px; background: #4CAF50; color: white; border-radius: 4px; margin: 10px 0; font-size: 14px; font-weight: 500;';
          const infoSection = document.querySelector('.info');
          if (infoSection) {
            infoSection.appendChild(countDisplay);
          }
        }
        
        if (searchTerm.length > 0) {
          countDisplay.textContent = count + ' results for "' + searchTerm + '"';
          countDisplay.style.display = 'block';
        } else {
          countDisplay.style.display = 'none';
        }
      }

      function highlightSearchResults(searchTerm) {
        clearHighlights();
        const operations = document.querySelectorAll('.opblock');
        operations.forEach(function(op) {
          const summary = op.querySelector('.opblock-summary');
          if (summary && summary.textContent.toLowerCase().includes(searchTerm)) {
            op.classList.add('highlighted');
            op.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        });
      }

      function clearHighlights() {
        const highlighted = document.querySelectorAll('.highlighted');
        highlighted.forEach(function(el) {
          el.classList.remove('highlighted');
        });
      }

      // Add API count display and statistics
      const infoSection = document.querySelector('.info');
      if (infoSection) {
        const operations = document.querySelectorAll('.opblock');
        const countBadge = document.createElement('div');
        countBadge.className = 'api-count';
        countBadge.innerHTML = '<span style="background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 15px; font-size: 12px; font-weight: 600;">' + operations.length + ' API Endpoints</span>';
        infoSection.appendChild(countBadge);

        // Add endpoint statistics
        const stats = {
          get: 0,
          post: 0,
          put: 0,
          patch: 0,
          delete: 0
        };
        
        operations.forEach(function(op) {
          const method = op.querySelector('.opblock-summary-method');
          if (method) {
            const methodText = method.textContent.toLowerCase();
            if (stats.hasOwnProperty(methodText)) {
              stats[methodText]++;
            }
          }
        });

        const statsDiv = document.createElement('div');
        statsDiv.style.cssText = 'margin-top: 10px; padding: 8px; background: rgba(0,0,0,0.1); border-radius: 4px; font-size: 11px;';
        statsDiv.innerHTML = '<span style="color: #61affe;">GET: ' + stats.get + '</span> | ' +
                            '<span style="color: #49cc90;">POST: ' + stats.post + '</span> | ' +
                            '<span style="color: #fca130;">PUT: ' + stats.put + '</span> | ' +
                            '<span style="color: #e67e22;">PATCH: ' + stats.patch + '</span> | ' +
                            '<span style="color: #f93e3e;">DELETE: ' + stats.delete + '</span>';
        infoSection.appendChild(statsDiv);
      }

      // Add tag filtering
      addTagFilter();

      function addTagFilter() {
        const tagBar = document.querySelector('.topbar');
        if (tagBar) {
          const filterDiv = document.createElement('div');
          filterDiv.style.cssText = 'display: flex; gap: 8px; padding: 8px; align-items: center;';
          filterDiv.innerHTML = '<span style="font-size: 12px; color: #fff;">Filter by tag:</span>';
          
          const tags = document.querySelectorAll('.swagger-ui .opblock-tag-section');
          const tagNames = Array.from(tags).map(tag => tag.querySelector('h4')?.textContent.replace(/\\s/g, '')).filter(Boolean);
          
          tagNames.forEach(tagName => {
            const button = document.createElement('button');
            button.textContent = tagName;
            button.style.cssText = 'padding: 4px 8px; border: 1px solid #fff; background: transparent; color: #fff; border-radius: 4px; cursor: pointer; font-size: 11px;';
            button.onclick = function() {
              filterByTag(tagName);
            };
            filterDiv.appendChild(button);
          });

          const showAllButton = document.createElement('button');
          showAllButton.textContent = 'Show All';
          showAllButton.style.cssText = 'padding: 4px 8px; border: 1px solid #4CAF50; background: #4CAF50; color: white; border-radius: 4px; cursor: pointer; font-size: 11px;';
          showAllButton.onclick = function() {
            showAllOperations();
          };
          filterDiv.appendChild(showAllButton);

          tagBar.appendChild(filterDiv);
        }
      }

      function filterByTag(tagName) {
        const operations = document.querySelectorAll('.opblock');
        operations.forEach(function(op) {
          const tagSection = op.closest('.opblock-tag-section');
          if (tagSection) {
            const sectionTag = tagSection.querySelector('h4')?.textContent.replace(/\\s/g, '');
            if (sectionTag === tagName) {
              op.style.display = 'block';
            } else {
              op.style.display = 'none';
            }
          }
        });
      }
    });
  `,
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: 'list',
    showRequestDuration: true,
    tryItOutEnabled: true,
    displayRequestDuration: true,
    displayOperationId: false,
    syntaxHighlight: {
      activate: true,
      theme: 'monokai'
    },
    // Enhanced search functionality
    deepLinking: true,
    showExtensions: true,
    showCommonExtensions: true,
    // Filter search configuration
    filter: true,
    // Default models expansion depth
    defaultModelsExpandDepth: 1,
    defaultModelExpandDepth: 1,
    // Tags sorting
    tagsSorter: 'alpha',
    operationsSorter: 'alpha',
    // Enable validator URL for schema validation
    validatorUrl: null,
    // Preload specs
    spec: {
      schemes: ['http', 'https'],
    },
    // Add search settings
    search: {
      depth: 3,
      threshold: 0.6,
    },
  },
};
