/**
 * Past Performance Model Tests
 * Comprehensive test suite with 95% coverage target
 */

const { Pool } = require('pg');
const PastPerformance = require('../../src/models/PastPerformance');

// Mock logger first
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Mock pg Pool
jest.mock('pg', () => ({
  Pool: jest.fn()
}));

describe('PastPerformance Model', () => {
  let pastPerformance;
  let mockPool;
  let mockLogger;

  beforeEach(() => {
    jest.clearAllMocks();

    // Get the mocked logger
    mockLogger = require('../../src/utils/logger');

    mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
      end: jest.fn()
    };

    Pool.mockImplementation(() => mockPool);
    pastPerformance = new PastPerformance();
  });

  describe('constructor', () => {
    it('should initialize with provided pool', () => {
      const customPool = { query: jest.fn() };
      const pp = new PastPerformance(customPool);
      expect(pp.pool).toBe(customPool);
    });

    it('should create new pool if none provided', () => {
      expect(Pool).toHaveBeenCalledWith({
        connectionString: process.env.DATABASE_URL
      });
    });
  });

  describe('create', () => {
    const validPPData = {
      projectName: 'Test Project',
      customer: 'Test Customer',
      summary: 'Test summary',
      dmePercentage: 70,
      omPercentage: 30
    };

    it('should create past performance record successfully', async () => {
      const mockResult = {
        rows: [{
          id: 'test-id',
          project_name: 'Test Project',
          customer: 'Test Customer',
          customer_type: 'Federal',
          summary: 'Test summary',
          dme_percentage: 70,
          om_percentage: 30,
          technologies_used: [],
          domain_areas: [],
          key_personnel: [],
          performance_metrics: {},
          relevance_tags: [],
          created_at: new Date(),
          updated_at: new Date()
        }]
      };

      mockPool.query.mockResolvedValueOnce(mockResult);

      const result = await pastPerformance.create(validPPData);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO past_performance'),
        expect.arrayContaining([
          'Test Project',
          'Test Customer',
          'Federal'
        ])
      );

      expect(result).toEqual(expect.objectContaining({
        id: 'test-id',
        projectName: 'Test Project',
        customer: 'Test Customer'
      }));

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Created past performance record: Test Project'
      );
    });

    it('should throw error for missing required fields', async () => {
      await expect(pastPerformance.create({})).rejects.toThrow(
        'Project name, customer, and summary are required'
      );

      await expect(pastPerformance.create({
        projectName: 'Test',
        customer: 'Customer'
      })).rejects.toThrow(
        'Project name, customer, and summary are required'
      );
    });

    it('should throw error for invalid percentage totals', async () => {
      const invalidData = {
        ...validPPData,
        dmePercentage: 60,
        omPercentage: 50 // Totals 110
      };

      await expect(pastPerformance.create(invalidData)).rejects.toThrow(
        'DME and O&M percentages must total 100'
      );
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed');
      mockPool.query.mockRejectedValueOnce(dbError);

      await expect(pastPerformance.create(validPPData)).rejects.toThrow(
        'Database connection failed'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error creating past performance: Database connection failed'
      );
    });

    it('should use default values for optional fields', async () => {
      const minimalData = {
        projectName: 'Test Project',
        customer: 'Test Customer',
        summary: 'Test summary'
      };

      const mockResult = {
        rows: [{
          id: 'test-id',
          project_name: 'Test Project',
          customer: 'Test Customer',
          customer_type: 'Federal',
          contract_type: 'Prime',
          work_type: 'Mixed',
          dme_percentage: 50,
          om_percentage: 50,
          summary: 'Test summary',
          technologies_used: [],
          domain_areas: [],
          key_personnel: [],
          performance_metrics: {},
          relevance_tags: [],
          confidence_score: 0.0,
          created_at: new Date(),
          updated_at: new Date()
        }]
      };

      mockPool.query.mockResolvedValueOnce(mockResult);

      const result = await pastPerformance.create(minimalData);

      expect(result).toEqual(expect.objectContaining({
        customerType: 'Federal',
        contractType: 'Prime',
        workType: 'Mixed',
        dmePercentage: 50,
        omPercentage: 50
      }));
    });
  });

  describe('getById', () => {
    it('should return past performance record by ID', async () => {
      const mockResult = {
        rows: [{
          id: 'test-id',
          project_name: 'Test Project',
          customer: 'Test Customer',
          created_at: new Date(),
          updated_at: new Date()
        }]
      };

      mockPool.query.mockResolvedValueOnce(mockResult);

      const result = await pastPerformance.getById('test-id');

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM past_performance WHERE id = $1',
        ['test-id']
      );

      expect(result).toEqual(expect.objectContaining({
        id: 'test-id',
        projectName: 'Test Project'
      }));
    });

    it('should return null for non-existent ID', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await pastPerformance.getById('non-existent');

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockPool.query.mockRejectedValueOnce(dbError);

      await expect(pastPerformance.getById('test-id')).rejects.toThrow('Database error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error getting past performance by ID: Database error'
      );
    });
  });

  describe('getAll', () => {
    const mockRecords = [
      {
        id: 'test-1',
        project_name: 'Project 1',
        customer: 'Customer 1',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 'test-2',
        project_name: 'Project 2',
        customer: 'Customer 2',
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    it('should return all records with default pagination', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }) // Count query
        .mockResolvedValueOnce({ rows: mockRecords }); // Data query

      const result = await pastPerformance.getAll();

      expect(result).toEqual({
        records: expect.arrayContaining([
          expect.objectContaining({ id: 'test-1' }),
          expect.objectContaining({ id: 'test-2' })
        ]),
        pagination: {
          total: 2,
          limit: 50,
          offset: 0,
          pages: 1,
          currentPage: 1
        }
      });
    });

    it('should apply customer filter', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [mockRecords[0]] });

      const filters = { customer: 'Customer 1' };
      await pastPerformance.getAll(filters);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('customer ILIKE'),
        expect.arrayContaining(['%Customer 1%'])
      );
    });

    it('should apply multiple filters', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [mockRecords[0]] });

      const filters = {
        customer: 'Customer 1',
        customerType: 'Federal',
        contractType: 'Prime',
        minValue: 1000000,
        maxValue: 5000000
      };

      await pastPerformance.getAll(filters);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE'),
        expect.arrayContaining([
          '%Customer 1%',
          'Federal',
          'Prime',
          1000000,
          5000000
        ])
      );
    });

    it('should apply technology filter', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [mockRecords[0]] });

      const filters = { technologies: ['Java', 'React'] };
      await pastPerformance.getAll(filters);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('technologies_used ?|'),
        expect.arrayContaining([['Java', 'React']])
      );
    });

    it('should apply search filter', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [mockRecords[0]] });

      const filters = { search: 'modernization' };
      await pastPerformance.getAll(filters);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('project_name ILIKE'),
        expect.arrayContaining(['%modernization%'])
      );
    });

    it('should handle custom pagination', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '100' }] })
        .mockResolvedValueOnce({ rows: mockRecords });

      const pagination = { limit: 10, offset: 20 };
      const result = await pastPerformance.getAll({}, pagination);

      expect(result.pagination).toEqual({
        total: 100,
        limit: 10,
        offset: 20,
        pages: 10,
        currentPage: 3
      });
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockPool.query.mockRejectedValueOnce(dbError);

      await expect(pastPerformance.getAll()).rejects.toThrow('Database error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error getting past performance records: Database error'
      );
    });
  });

  describe('update', () => {
    it('should update past performance record successfully', async () => {
      const updates = {
        projectName: 'Updated Project',
        summary: 'Updated summary'
      };

      const mockResult = {
        rows: [{
          id: 'test-id',
          project_name: 'Updated Project',
          summary: 'Updated summary',
          updated_at: new Date()
        }]
      };

      mockPool.query.mockResolvedValueOnce(mockResult);

      const result = await pastPerformance.update('test-id', updates);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE past_performance'),
        expect.arrayContaining(['Updated Project', 'Updated summary', 'test-id'])
      );

      expect(result).toEqual(expect.objectContaining({
        projectName: 'Updated Project'
      }));

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Updated past performance record: test-id'
      );
    });

    it('should return null for non-existent record', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await pastPerformance.update('non-existent', { projectName: 'Test' });

      expect(result).toBeNull();
    });

    it('should throw error for no valid fields', async () => {
      await expect(pastPerformance.update('test-id', { invalidField: 'value' }))
        .rejects.toThrow('No valid fields to update');
    });

    it('should validate percentage totals on update', async () => {
      const updates = {
        dmePercentage: 60,
        omPercentage: 50
      };

      await expect(pastPerformance.update('test-id', updates))
        .rejects.toThrow('DME and O&M percentages must total 100');
    });

    it('should handle JSON field updates', async () => {
      const updates = {
        technologiesUsed: ['Java', 'React'],
        performanceMetrics: { uptime: 99.9 }
      };

      const mockResult = {
        rows: [{
          id: 'test-id',
          technologies_used: ['Java', 'React'],
          performance_metrics: { uptime: 99.9 },
          updated_at: new Date()
        }]
      };

      mockPool.query.mockResolvedValueOnce(mockResult);

      await pastPerformance.update('test-id', updates);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('technologies_used = $1'),
        expect.arrayContaining([
          JSON.stringify(['Java', 'React']),
          JSON.stringify({ uptime: 99.9 }),
          'test-id'
        ])
      );
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockPool.query.mockRejectedValueOnce(dbError);

      await expect(pastPerformance.update('test-id', { projectName: 'Test' }))
        .rejects.toThrow('Database error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error updating past performance: Database error'
      );
    });
  });

  describe('delete', () => {
    it('should delete past performance record successfully', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'test-id' }] });

      const result = await pastPerformance.delete('test-id');

      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM past_performance WHERE id = $1 RETURNING id',
        ['test-id']
      );

      expect(result).toBe(true);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Deleted past performance record: test-id'
      );
    });

    it('should return false for non-existent record', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await pastPerformance.delete('non-existent');

      expect(result).toBe(false);
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockPool.query.mockRejectedValueOnce(dbError);

      await expect(pastPerformance.delete('test-id')).rejects.toThrow('Database error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error deleting past performance: Database error'
      );
    });
  });

  describe('semanticSearch', () => {
    it('should perform semantic search (mock implementation)', async () => {
      const mockRecords = [
        {
          id: 'test-1',
          project_name: 'Java Project',
          summary: 'Java-based solution',
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: mockRecords });

      const queryEmbedding = new Array(1536).fill(0.1);
      const filters = { searchTerm: 'Java' };

      const result = await pastPerformance.semanticSearch(queryEmbedding, filters, 5);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expect.objectContaining({
        id: 'test-1',
        similarityScore: expect.any(Number),
        relevanceReason: 'Text-based match (vector search not yet implemented)'
      }));
    });
  });

  describe('getStatistics', () => {
    it('should return comprehensive statistics', async () => {
      const mockResults = [
        { rows: [{ count: '10' }] }, // total
        { rows: [{ customer_type: 'Federal', count: '8' }] }, // byCustomerType
        { rows: [{ work_type: 'DME', count: '6' }] }, // byWorkType
        { rows: [{ contract_type: 'Prime', count: '7' }] }, // byContractType
        { rows: [{ avg_value: '5000000', min_value: '1000000', max_value: '10000000' }] }, // averageValue
        { rows: [{ month: '2023-10-01', count: '3' }] } // recentActivity
      ];

      mockPool.query
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1])
        .mockResolvedValueOnce(mockResults[2])
        .mockResolvedValueOnce(mockResults[3])
        .mockResolvedValueOnce(mockResults[4])
        .mockResolvedValueOnce(mockResults[5]);

      const result = await pastPerformance.getStatistics();

      expect(result).toEqual({
        total: 10,
        byCustomerType: [{ customer_type: 'Federal', count: '8' }],
        byWorkType: [{ work_type: 'DME', count: '6' }],
        byContractType: [{ contract_type: 'Prime', count: '7' }],
        contractValues: { avg_value: '5000000', min_value: '1000000', max_value: '10000000' },
        recentActivity: [{ month: '2023-10-01', count: '3' }]
      });
    });

    it('should handle database errors in statistics', async () => {
      const dbError = new Error('Statistics error');
      mockPool.query.mockRejectedValueOnce(dbError);

      await expect(pastPerformance.getStatistics()).rejects.toThrow('Statistics error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error getting statistics: Statistics error'
      );
    });
  });

  describe('formatPastPerformance', () => {
    it('should format database row correctly', () => {
      const dbRow = {
        id: 'test-id',
        project_name: 'Test Project',
        customer: 'Test Customer',
        customer_type: 'Federal',
        contract_number: 'ABC-123',
        contract_value: 5000000,
        contract_type: 'Prime',
        start_date: '2023-01-01',
        end_date: '2023-12-31',
        work_type: 'DME',
        dme_percentage: 80,
        om_percentage: 20,
        summary: 'Test summary',
        technical_approach: 'Test approach',
        technologies_used: ['Java', 'React'],
        domain_areas: ['Financial'],
        key_personnel: [{ name: 'John Doe', role: 'Lead' }],
        performance_metrics: { uptime: 99.9 },
        lessons_learned: 'Test lessons',
        challenges_overcome: 'Test challenges',
        relevance_tags: ['tag1'],
        confidence_score: 0.95,
        created_at: new Date('2023-01-01'),
        updated_at: new Date('2023-01-02')
      };

      const result = pastPerformance.formatPastPerformance(dbRow);

      expect(result).toEqual({
        id: 'test-id',
        projectName: 'Test Project',
        customer: 'Test Customer',
        customerType: 'Federal',
        contractNumber: 'ABC-123',
        contractValue: 5000000,
        contractType: 'Prime',
        startDate: '2023-01-01',
        endDate: '2023-12-31',
        workType: 'DME',
        dmePercentage: 80,
        omPercentage: 20,
        summary: 'Test summary',
        technicalApproach: 'Test approach',
        technologiesUsed: ['Java', 'React'],
        domainAreas: ['Financial'],
        keyPersonnel: [{ name: 'John Doe', role: 'Lead' }],
        performanceMetrics: { uptime: 99.9 },
        lessonsLearned: 'Test lessons',
        challengesOvercome: 'Test challenges',
        relevanceTags: ['tag1'],
        confidenceScore: 0.95,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02')
      });
    });

    it('should handle null/undefined JSON fields', () => {
      const dbRow = {
        id: 'test-id',
        project_name: 'Test Project',
        customer: 'Test Customer',
        technologies_used: null,
        domain_areas: undefined,
        key_personnel: null,
        performance_metrics: undefined,
        relevance_tags: null,
        created_at: new Date(),
        updated_at: new Date()
      };

      const result = pastPerformance.formatPastPerformance(dbRow);

      expect(result).toEqual(expect.objectContaining({
        technologiesUsed: [],
        domainAreas: [],
        keyPersonnel: [],
        performanceMetrics: {},
        relevanceTags: []
      }));
    });
  });
});

// Test coverage helper
describe('Edge Cases and Error Handling', () => {
  let pastPerformance;
  let mockPool;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPool = { query: jest.fn() };
    Pool.mockImplementation(() => mockPool);
    pastPerformance = new PastPerformance();
  });

  it('should handle concurrent access gracefully', async () => {
    const validPPData = {
      projectName: 'Concurrent Test',
      customer: 'Test Customer',
      summary: 'Test summary'
    };

    const mockResult = {
      rows: [{
        id: 'concurrent-id',
        project_name: 'Concurrent Test',
        customer: 'Test Customer',
        summary: 'Test summary',
        created_at: new Date(),
        updated_at: new Date()
      }]
    };

    mockPool.query.mockResolvedValue(mockResult);

    // Simulate concurrent creates
    const promises = Array(5).fill().map(() => pastPerformance.create(validPPData));
    const results = await Promise.all(promises);

    expect(results).toHaveLength(5);
    expect(mockPool.query).toHaveBeenCalledTimes(5);
  });

  it('should handle empty result sets correctly', async () => {
    // Mock two separate query calls for count and data
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // Count query
      .mockResolvedValueOnce({ rows: [] }); // Data query

    const result = await pastPerformance.getAll();

    expect(result).toEqual({
      records: [],
      pagination: {
        total: 0,
        limit: 50,
        offset: 0,
        pages: 0,
        currentPage: 1
      }
    });
  });

  it('should handle malformed filter data', async () => {
    const malformedFilters = {
      minValue: 'not-a-number',
      technologies: 'not-an-array',
      invalidField: 'should be ignored'
    };

    mockPool.query
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [] });

    // Should not throw error, should handle gracefully
    const result = await pastPerformance.getAll(malformedFilters);
    expect(result.records).toEqual([]);
  });
});