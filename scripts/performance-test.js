import axios from 'axios';
import { performance } from 'perf_hooks';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3001';
const CONCURRENT_REQUESTS = 50;
const TOTAL_REQUESTS = 1000;

class PerformanceTester {
    constructor() {
        this.results = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            responseTimes: [],
            errors: []
        };
    }

    async makeRequest(endpoint, method = 'GET', data = null) {
        const startTime = performance.now();
        
        try {
            const response = await axios({
                method,
                url: `${BASE_URL}${endpoint}`,
                data,
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const endTime = performance.now();
            const responseTime = endTime - startTime;
            
            this.results.successfulRequests++;
            this.results.responseTimes.push(responseTime);
            
            return {
                success: true,
                status: response.status,
                responseTime,
                data: response.data
            };
        } catch (error) {
            const endTime = performance.now();
            const responseTime = endTime - startTime;
            
            this.results.failedRequests++;
            this.results.errors.push({
                endpoint,
                error: error.message,
                status: error.response?.status,
                responseTime
            });
            
            return {
                success: false,
                error: error.message,
                status: error.response?.status,
                responseTime
            };
        }
    }

    async runConcurrentTest(endpoint, requestsPerBatch = CONCURRENT_REQUESTS) {
        console.log(`🚀 Testing ${endpoint} with ${requestsPerBatch} concurrent requests...`);
        
        const promises = [];
        for (let i = 0; i < requestsPerBatch; i++) {
            promises.push(this.makeRequest(endpoint));
            this.results.totalRequests++;
        }
        
        const startTime = performance.now();
        const results = await Promise.allSettled(promises);
        const endTime = performance.now();
        
        const totalTime = endTime - startTime;
        const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        const failed = results.length - successful;
        
        console.log(`✅ Batch completed: ${successful} successful, ${failed} failed in ${totalTime.toFixed(2)}ms`);
        
        return {
            totalTime,
            successful,
            failed,
            requestsPerSecond: (requestsPerBatch / totalTime) * 1000
        };
    }

    async runLoadTest(endpoint, totalRequests = TOTAL_REQUESTS) {
        console.log(`🔥 Starting load test for ${endpoint} with ${totalRequests} total requests...`);
        
        const startTime = performance.now();
        let completed = 0;
        const batchSize = Math.min(CONCURRENT_REQUESTS, totalRequests);
        
        while (completed < totalRequests) {
            const remainingRequests = totalRequests - completed;
            const currentBatchSize = Math.min(batchSize, remainingRequests);
            
            const batchResult = await this.runConcurrentTest(endpoint, currentBatchSize);
            completed += currentBatchSize;
            
            // Progress indicator
            const progress = ((completed / totalRequests) * 100).toFixed(1);
            console.log(`📊 Progress: ${progress}% (${completed}/${totalRequests})`);
            
            // Small delay between batches to prevent overwhelming the server
            if (completed < totalRequests) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        const endTime = performance.now();
        const totalTime = endTime - startTime;
        
        return this.generateReport(endpoint, totalTime);
    }

    generateReport(endpoint, totalTime) {
        const { responseTimes, successfulRequests, failedRequests, totalRequests } = this.results;
        
        if (responseTimes.length === 0) {
            console.log('❌ No successful requests to analyze');
            return;
        }
        
        responseTimes.sort((a, b) => a - b);
        
        const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        const minResponseTime = responseTimes[0];
        const maxResponseTime = responseTimes[responseTimes.length - 1];
        const p50ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.5)];
        const p95ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.95)];
        const p99ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.99)];
        
        const requestsPerSecond = totalRequests / (totalTime / 1000);
        const successRate = (successfulRequests / totalRequests) * 100;
        
        const report = {
            endpoint,
            summary: {
                totalRequests,
                successfulRequests,
                failedRequests,
                successRate: `${successRate.toFixed(2)}%`,
                totalTime: `${(totalTime / 1000).toFixed(2)}s`,
                requestsPerSecond: requestsPerSecond.toFixed(2)
            },
            responseTimes: {
                average: `${avgResponseTime.toFixed(2)}ms`,
                minimum: `${minResponseTime.toFixed(2)}ms`,
                maximum: `${maxResponseTime.toFixed(2)}ms`,
                p50: `${p50ResponseTime.toFixed(2)}ms`,
                p95: `${p95ResponseTime.toFixed(2)}ms`,
                p99: `${p99ResponseTime.toFixed(2)}ms`
            }
        };
        
        console.log('\n📊 PERFORMANCE TEST REPORT');
        console.log('========================');
        console.log(`Endpoint: ${endpoint}`);
        console.log(`Total Requests: ${report.summary.totalRequests}`);
        console.log(`Successful: ${report.summary.successfulRequests}`);
        console.log(`Failed: ${report.summary.failedRequests}`);
        console.log(`Success Rate: ${report.summary.successRate}`);
        console.log(`Total Time: ${report.summary.totalTime}`);
        console.log(`Requests/Second: ${report.summary.requestsPerSecond}`);
        console.log('\nResponse Times:');
        console.log(`  Average: ${report.responseTimes.average}`);
        console.log(`  Minimum: ${report.responseTimes.minimum}`);
        console.log(`  Maximum: ${report.responseTimes.maximum}`);
        console.log(`  P50: ${report.responseTimes.p50}`);
        console.log(`  P95: ${report.responseTimes.p95}`);
        console.log(`  P99: ${report.responseTimes.p99}`);
        
        if (this.results.errors.length > 0) {
            console.log('\n❌ Errors:');
            this.results.errors.slice(0, 5).forEach(error => {
                console.log(`  ${error.endpoint}: ${error.error} (${error.status})`);
            });
            if (this.results.errors.length > 5) {
                console.log(`  ... and ${this.results.errors.length - 5} more errors`);
            }
        }
        
        return report;
    }

    reset() {
        this.results = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            responseTimes: [],
            errors: []
        };
    }
}

// Test scenarios
async function runPerformanceTests() {
    const tester = new PerformanceTester();
    
    console.log('🎯 Starting Performance Tests for GAM Backend');
    console.log(`Base URL: ${BASE_URL}`);
    console.log('==========================================\n');
    
    try {
        // Test 1: Health check endpoint
        console.log('1️⃣ Testing Health Check Endpoint');
        await tester.runLoadTest('/health', 100);
        tester.reset();
        
        // Test 2: GraphQL endpoint (if available)
        console.log('\n2️⃣ Testing GraphQL Endpoint');
        await tester.runLoadTest('/graphql', 200);
        tester.reset();
        
        // Test 3: API endpoints
        console.log('\n3️⃣ Testing API Endpoints');
        await tester.runLoadTest('/api/v1/user', 300);
        tester.reset();
        
        // Test 4: High concurrency test
        console.log('\n4️⃣ Testing High Concurrency (1000 requests)');
        await tester.runLoadTest('/health', 1000);
        
    } catch (error) {
        console.error('❌ Performance test failed:', error);
    }
    
    console.log('\n✅ Performance tests completed!');
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runPerformanceTests().catch(console.error);
}

export { PerformanceTester, runPerformanceTests };
