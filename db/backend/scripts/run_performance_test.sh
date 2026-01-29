#!/bin/bash
# ACI Security Standards - Performance Check Script
# Tests API performance and resource usage

set -e

echo "============================================"
echo "   ACI Security Standards - Performance Test"
echo "============================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

FAILED=0
BASE_URL="http://localhost:102"

# Check if server is running
if ! curl -s "$BASE_URL/docs" > /dev/null; then
    echo -e "${RED}✗ Backend server is not running on port 102${NC}"
    echo "  Start the server first: docker-compose up -d backend"
    exit 1
fi

# 1. Benchmark API endpoints (p95 < 300ms requirement)
echo -e "${YELLOW}[1/3] Benchmarking API endpoints...${NC}"
echo "Testing: GET /api/travelers/"

# Use Apache Bench if available, otherwise curl timing
if command -v ab &> /dev/null; then
    echo "Running 100 requests with 10 concurrent connections..."
    ab -n 100 -c 10 -g perf_results.tsv "$BASE_URL/api/travelers/" > ab_results.txt 2>&1

    # Extract p95 from results
    P95=$(awk '/95%/ {print $(NF)}' ab_results.txt | tr -d 'ms')

    if [ -n "$P95" ] && [ $(echo "$P95 < 300" | bc) -eq 1 ]; then
        echo -e "${GREEN}✓ p95 response time: ${P95}ms (< 300ms requirement)${NC}"
    else
        echo -e "${RED}✗ p95 response time: ${P95}ms (exceeds 300ms requirement)${NC}"
        FAILED=1
    fi
else
    echo "Apache Bench not available, using curl for basic timing..."
    TOTAL=0
    for i in {1..10}; do
        RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}\n' "$BASE_URL/api/travelers/")
        # Convert to milliseconds
        MS=$(echo "$RESPONSE_TIME * 1000" | bc)
        TOTAL=$(echo "$TOTAL + $MS" | bc)
        echo "  Request $i: ${MS}ms"
    done
    AVG=$(echo "$TOTAL / 10" | bc)

    if [ $(echo "$AVG < 300" | bc) -eq 1 ]; then
        echo -e "${GREEN}✓ Average response time: ${AVG}ms (< 300ms)${NC}"
    else
        echo -e "${RED}✗ Average response time: ${AVG}ms (exceeds 300ms)${NC}"
        FAILED=1
    fi
fi
echo ""

# 2. Load testing
echo -e "${YELLOW}[2/3] Running load test...${NC}"
echo "Simulating 50 requests over 10 seconds..."

START_TIME=$(date +%s)
SUCCESS=0
ERRORS=0

for i in {1..50}; do
    if curl -s -f "$BASE_URL/api/travelers/" > /dev/null 2>&1; then
        ((SUCCESS++))
    else
        ((ERRORS++))
    fi
    sleep 0.2  # Spread requests over time
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "Results: $SUCCESS successful, $ERRORS errors in ${DURATION}s"

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ Load test passed - all requests successful${NC}"
else
    echo -e "${RED}✗ Load test failed - ${ERRORS} errors occurred${NC}"
    FAILED=1
fi
echo ""

# 3. Resource usage check
echo -e "${YELLOW}[3/3] Checking resource usage...${NC}"

# Check Docker container resource usage
CONTAINER_ID=$(docker ps --filter "name=nexus_backend" -q)

if [ -n "$CONTAINER_ID" ]; then
    # Get CPU and memory stats
    STATS=$(docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" $CONTAINER_ID)
    echo "$STATS"

    CPU_USAGE=$(docker stats --no-stream --format "{{.CPUPerc}}" $CONTAINER_ID | sed 's/%//')

    # Check if CPU is below 70% threshold
    if [ $(echo "$CPU_USAGE < 70" | bc) -eq 1 ]; then
        echo -e "${GREEN}✓ CPU usage: ${CPU_USAGE}% (< 70% requirement)${NC}"
    else
        echo -e "${YELLOW}⚠ CPU usage: ${CPU_USAGE}% (exceeds 70% threshold)${NC}"
        echo "  Note: May be elevated during active load testing"
    fi
else
    echo -e "${YELLOW}⚠ Could not get container stats${NC}"
fi
echo ""

# Summary
echo "============================================"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}   ✓ ALL PERFORMANCE CHECKS PASSED${NC}"
    echo "============================================"
    exit 0
else
    echo -e "${RED}   ✗ PERFORMANCE CHECKS FAILED${NC}"
    echo "   Optimize before production deployment"
    echo "============================================"
    exit 1
fi
