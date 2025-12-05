#!/bin/bash
# ACI Security Standards - Quality Check Script
# Verifies code quality and test coverage

set -e

echo "============================================"
echo "   ACI Security Standards - Quality Check"
echo "============================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

FAILED=0

# 1. Run unit tests with coverage
echo -e "${YELLOW}[1/4] Running unit tests with coverage...${NC}"
if pytest --cov=. --cov-report=html --cov-report=term-missing --cov-fail-under=80 -v; then
    echo -e "${GREEN}✓ Tests passed with >= 80% coverage${NC}"
else
    echo -e "${RED}✗ Tests failed or coverage below 80%${NC}"
    FAILED=1
fi
echo ""

# 2. Lint code with flake8
echo -e "${YELLOW}[2/4] Running flake8 linter...${NC}"
if flake8 .; then
    echo -e "${GREEN}✓ Linting passed${NC}"
else
    echo -e "${RED}✗ Linting found issues${NC}"
    FAILED=1
fi
echo ""

# 3. Check code formatting with black
echo -e "${YELLOW}[3/4] Checking code formatting...${NC}"
if black --check .; then
    echo -e "${GREEN}✓ Code formatting is correct${NC}"
else
    echo -e "${RED}✗ Code formatting issues found. Run: black .${NC}"
    FAILED=1
fi
echo ""

# 4. Type checking with mypy
echo -e "${YELLOW}[4/4] Running type checker...${NC}"
if mypy . --ignore-missing-imports --no-strict-optional; then
    echo -e "${GREEN}✓ Type checking passed${NC}"
else
    echo -e "${RED}✗ Type checking found issues${NC}"
    FAILED=1
fi
echo ""

# Summary
echo "============================================"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}   ✓ ALL QUALITY CHECKS PASSED${NC}"
    echo "============================================"
    exit 0
else
    echo -e "${RED}   ✗ QUALITY CHECKS FAILED${NC}"
    echo "   Fix issues before production deployment"
    echo "============================================"
    exit 1
fi
