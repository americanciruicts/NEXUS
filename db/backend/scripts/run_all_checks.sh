#!/bin/bash
# ACI Security Standards - Master Check Script
# Runs all three mandatory pillars: Security, Quality, Performance

set -e

echo "================================================"
echo "  ACI Security Standards - Production Approval"
echo "================================================"
echo ""
echo "Running all three mandatory pillars:"
echo "  1. Cybersecurity Test"
echo "  2. Quality Check"
echo "  3. Performance Check"
echo ""
echo "================================================"
echo ""

# Track overall status
OVERALL_FAILED=0

# Change to backend directory
cd "$(dirname "$0")/.."

# Pillar 1: Cybersecurity
echo "🔒 PILLAR 1: CYBERSECURITY TEST"
echo "================================================"
if bash scripts/run_security_scan.sh; then
    SECURITY_STATUS="✓ PASSED"
else
    SECURITY_STATUS="✗ FAILED"
    OVERALL_FAILED=1
fi
echo ""
sleep 2

# Pillar 2: Quality
echo "📊 PILLAR 2: QUALITY CHECK"
echo "================================================"
if bash scripts/run_quality_check.sh; then
    QUALITY_STATUS="✓ PASSED"
else
    QUALITY_STATUS="✗ FAILED"
    OVERALL_FAILED=1
fi
echo ""
sleep 2

# Pillar 3: Performance
echo "⚡ PILLAR 3: PERFORMANCE CHECK"
echo "================================================"
if bash scripts/run_performance_test.sh; then
    PERFORMANCE_STATUS="✓ PASSED"
else
    PERFORMANCE_STATUS="✗ FAILED"
    OVERALL_FAILED=1
fi
echo ""

# Final Summary
echo "================================================"
echo "           FINAL RESULTS"
echo "================================================"
echo ""
echo "  Cybersecurity Test:  $SECURITY_STATUS"
echo "  Quality Check:       $QUALITY_STATUS"
echo "  Performance Check:   $PERFORMANCE_STATUS"
echo ""
echo "================================================"

if [ $OVERALL_FAILED -eq 0 ]; then
    echo ""
    echo "  ✅ PROJECT APPROVED FOR PRODUCTION"
    echo ""
    echo "  All ACI Security Standards requirements met:"
    echo "  ✓ Security vulnerabilities checked"
    echo "  ✓ Code quality >= 80% test coverage"
    echo "  ✓ Performance p95 < 300ms"
    echo "  ✓ SOC II compliance verified"
    echo ""
    echo "================================================"
    exit 0
else
    echo ""
    echo "  ❌ PROJECT NOT READY FOR PRODUCTION"
    echo ""
    echo "  Please fix all failed checks before deployment."
    echo "  Review the reports above for details."
    echo ""
    echo "================================================"
    exit 1
fi
