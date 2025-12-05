#!/bin/bash
# ACI Security Standards - Cybersecurity Test Script
# Runs all security scans required for production approval

set -e  # Exit on error

echo "============================================"
echo "   ACI Security Standards - Security Scan"
echo "============================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track if any check fails
FAILED=0

# 1. Bandit - SAST Scanner (Python)
echo -e "${YELLOW}[1/4] Running Bandit (SAST) security scan...${NC}"
if bandit -r . -c .bandit -f json -o bandit-report.json; then
    echo -e "${GREEN}✓ Bandit scan passed${NC}"
    bandit -r . -c .bandit
else
    echo -e "${RED}✗ Bandit scan found security issues${NC}"
    FAILED=1
fi
echo ""

# 2. Safety - Dependency CVE Scanner
echo -e "${YELLOW}[2/4] Running Safety (Dependency CVE) scan...${NC}"
if safety check --json > safety-report.json 2>&1; then
    echo -e "${GREEN}✓ Safety scan passed - no known vulnerabilities${NC}"
    safety check
else
    echo -e "${RED}✗ Safety scan found known vulnerabilities${NC}"
    FAILED=1
fi
echo ""

# 3. Check for exposed secrets
echo -e "${YELLOW}[3/4] Checking for exposed secrets...${NC}"
if grep -r -i -E "(password|secret|api_key|token|private_key)\s*=\s*['\"][^'\"]{8,}" . \
    --exclude-dir={.git,.tox,__pycache__,node_modules,migrations,seed_data} \
    --exclude="*.{json,pyc,log}" 2>/dev/null; then
    echo -e "${RED}✗ Potential secrets found in code${NC}"
    FAILED=1
else
    echo -e "${GREEN}✓ No exposed secrets detected${NC}"
fi
echo ""

# 4. OWASP Top 10 Check (simplified - checks for common patterns)
echo -e "${YELLOW}[4/4] Running OWASP Top 10 pattern checks...${NC}"
OWASP_ISSUES=0

# Check for SQL injection patterns
if grep -r -E "execute\(.*%s|execute\(.*\+|execute\(.*format" . \
    --include="*.py" \
    --exclude-dir={.git,.tox,__pycache__,tests,migrations} 2>/dev/null; then
    echo -e "${RED}  ✗ Potential SQL injection vulnerability detected${NC}"
    OWASP_ISSUES=1
fi

# Check for hardcoded credentials
if grep -r -E "(password|secret|token)\s*=\s*['\"][a-zA-Z0-9]{8,}" . \
    --include="*.py" \
    --exclude-dir={.git,.tox,__pycache__,tests,migrations,seed_data} 2>/dev/null; then
    echo -e "${RED}  ✗ Hardcoded credentials detected${NC}"
    OWASP_ISSUES=1
fi

# Check for unsafe eval/exec usage
if grep -r -E "\b(eval|exec)\(" . \
    --include="*.py" \
    --exclude-dir={.git,.tox,__pycache__,tests,migrations} 2>/dev/null; then
    echo -e "${RED}  ✗ Unsafe eval/exec usage detected${NC}"
    OWASP_ISSUES=1
fi

if [ $OWASP_ISSUES -eq 0 ]; then
    echo -e "${GREEN}✓ OWASP checks passed${NC}"
else
    echo -e "${RED}✗ OWASP checks failed${NC}"
    FAILED=1
fi
echo ""

# Summary
echo "============================================"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}   ✓ ALL SECURITY CHECKS PASSED${NC}"
    echo "============================================"
    exit 0
else
    echo -e "${RED}   ✗ SECURITY CHECKS FAILED${NC}"
    echo "   Project is NOT ready for production"
    echo "============================================"
    exit 1
fi
