import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  resultLaundry,
  extractLLMs,
  extractTestcases,
  getTestStats,
  evaluationScore,
  calculateTotalScore,
  getAggregatedScores,
  findDifficulties,
  getLLMScores,
  generateResponseLogs,
  TestCase,
  LLMEval,
  TestScore,
  resultsType
} from './generateEvalScore';
import * as fs from 'fs';
import * as path from 'path';

// Mock the fs module
vi.mock('fs', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdirSync: vi.fn(),
}));

describe('generateEvalScore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('resultLaundry', () => {
    it('should remove specific properties from result', () => {
      const result = {
        table: {},
        stats: {},
        results: [
          { vars: { _conversation: 'test', prompt: 'testPrompt' } },
          { vars: {} },
        ],
      };
      resultLaundry(result);
      expect(result).toEqual({
        results: [
          { vars: {} },
          { vars: {} },
        ],
      });
    });
  });

  describe('extractLLMs', () => {
    it('should extract and sort unique provider IDs', () => {
      const result = {
        results: [
          { provider: { id: 'provider2' } },
          { provider: { id: 'provider1' } },
          { provider: { id: 'provider2' } },
        ],
      };
      const providers = extractLLMs(result);
      expect(providers).toEqual(['provider1', 'provider2']);
    });
  });

  describe('extractTestcases', () => {
    it('should extract unique test cases and sort them', () => {
      const result = {
        results: [
          { vars: { name: 'testB', difficulties: { "context-length": 1, "reasoning-depth": 2, "instruction-compliance": 3 } } },
          { vars: { name: 'testA', difficulties: { "context-length": 2, "reasoning-depth": 1, "instruction-compliance": 3 } } },
          { vars: { name: 'testA', difficulties: { "context-length": 2, "reasoning-depth": 1, "instruction-compliance": 3 } } },
        ],
      };
      const testcases = extractTestcases(result);
      expect(testcases).toEqual([
        { name: 'testA', difficulties: { "context-length": 2, "reasoning-depth": 1, "instruction-compliance": 3 } },
        { name: 'testB', difficulties: { "context-length": 1, "reasoning-depth": 2, "instruction-compliance": 3 } },
      ]);
    });
  });

  describe('getTestStats', () => {
    it('should calculate test statistics correctly', () => {
      const scores: LLMEval[] = [
        { llm_id: 'provider1', scores: [], aggregated_scores: { context_length: 5, reasoning_depth: 3, instruction_compliance: 4 }, total_score: 12 },
      ];
      const tests: TestCase[] = [
        { name: 'testA', difficulties: { "context-length": 2, "reasoning-depth": 1, "instruction-compliance": 3 } },
      ];
      const startTime = 1000;
      const endTime = 2000;
      const stats = getTestStats(scores, tests, startTime, endTime);
      expect(stats).toEqual({
        llms: ['provider1'],
        max_total_score: 6,
        max_context_length: 2,
        max_reasoning_depth: 1,
        max_instruction_compliance: 3,
        testcases: [
          { name: 'testA', max_score: 6, difficulties: { "context-length": 2, "reasoning-depth": 1, "instruction-compliance": 3 } },
        ],
        startTime,
        endTime,
      });
    });
  });

  describe('evaluationScore', () => {
    it('should evaluate scores for LLMs correctly', () => {
      const providers = ['provider1'];
      const tests: TestCase[] = [
        { name: 'testA', difficulties: { "context-length": 2, "reasoning-depth": 1, "instruction-compliance": 3 } },
      ];
      const result = {
        results: [
          { provider: { id: 'provider1' }, vars: { name: 'testA' }, score: 1 },
        ],
      };
      const scores = evaluationScore(providers, tests, result);
      expect(scores).toEqual([
        {
          llm_id: 'provider1',
          scores: [
            { test_name: 'testA', assertion_score: 1, test_score: 6, repeat: 1 },
          ],
          aggregated_scores: { context_length: 2, reasoning_depth: 1, instruction_compliance: 3 },
          total_score: 6,
        },
      ]);
    });
  });

  describe('calculateTotalScore', () => {
    it('should calculate total score correctly', () => {
      const aggregated_scores = { context_length: 2, reasoning_depth: 1, instruction_compliance: 3 };
      const totalScore = calculateTotalScore(aggregated_scores);
      expect(totalScore).toBe(6);
    });
  });

  describe('getAggregatedScores', () => {
    it('should calculate aggregated scores correctly', () => {
      const scores: TestScore[] = [
        { test_name: 'testA', assertion_score: 1, test_score: 6, repeat: 1 },
      ];
      const tests: TestCase[] = [
        { name: 'testA', difficulties: { "context-length": 2, "reasoning-depth": 1, "instruction-compliance": 3 } },
      ];
      const aggregatedScores = getAggregatedScores(scores, tests);
      expect(aggregatedScores).toEqual({ context_length: 2, reasoning_depth: 1, instruction_compliance: 3 });
    });
  });

  describe('findDifficulties', () => {
    it('should find difficulties for a given test name', () => {
      const tests: TestCase[] = [
        { name: 'testA', difficulties: { "context-length": 2, "reasoning-depth": 1, "instruction-compliance": 3 } },
      ];
      const difficulties = findDifficulties('testA', tests);
      expect(difficulties).toEqual({ "context-length": 2, "reasoning-depth": 1, "instruction-compliance": 3 });
    });
  });

  describe('getLLMScores', () => {
    it('should calculate LLM scores correctly', () => {
      const llm_id = 'provider1';
      const results = [
        { provider: { id: 'provider1' }, vars: { name: 'testA' }, score: 1 },
      ];
      const tests: TestCase[] = [
        { name: 'testA', difficulties: { "context-length": 2, "reasoning-depth": 1, "instruction-compliance": 3 } },
      ];
      const scores = getLLMScores(llm_id, results, tests);
      expect(scores).toEqual([
        { test_name: 'testA', assertion_score: 1, test_score: 6, repeat: 1 },
      ]);
    });
  });

  describe('generateResponseLogs', () => {
    it('should generate response logs and reports', () => {
      const rawResp: resultsType = {
        evalId: 'eval1',
        results: {
          timestamp: '2024-11-01T00:00:00Z',
          results: [
            { provider: { id: 'provider1' }, vars: { name: 'testA', difficulties: { "context-length": 2, "reasoning-depth": 1, "instruction-compliance": 3 } }, score: 1, prompt: { raw: 'promptText' }, response: { output: 'responseText' } },
          ],
        },
      };
      const scores: LLMEval[] = [
        {
          llm_id: 'provider1',
          scores: [
            { test_name: 'testA', assertion_score: 1, test_score: 6, repeat: 1 },
          ],
          aggregated_scores: { context_length: 2, reasoning_depth: 1, instruction_compliance: 3 },
          total_score: 6,
        },
      ];
      const testStats = {
        llms: ['provider1'],
        max_total_score: 6,
        max_context_length: 2,
        max_reasoning_depth: 1,
        max_instruction_compliance: 3,
        testcases: [
          { name: 'testA', max_score: 6, difficulties: { "context-length": 2, "reasoning-depth": 1, "instruction-compliance": 3 } },
        ],
        startTime: 1000,
        endTime: 2000,
      };
      const extractedTestcases: TestCase[] = [
        { name: 'testA', difficulties: { "context-length": 2, "reasoning-depth": 1, "instruction-compliance": 3 } },
      ];

      generateResponseLogs(rawResp, scores, testStats, extractedTestcases);

      expect(fs.writeFile).toHaveBeenCalled();
      expect(fs.mkdirSync).toHaveBeenCalled();
    });
  });
});
