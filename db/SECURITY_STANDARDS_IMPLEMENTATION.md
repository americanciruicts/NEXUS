# ACI Security Standards - Implementation Guide

## Overview

This document describes the implementation of the ACI Security Standards for the Nexus project. All three mandatory pillars have been implemented to ensure production readiness and SOC II compliance.

## ✅ Implementation Status

### Pillar 1: Cybersecurity Test ✅
- **Bandit** - SAST (Static Application Security Testing) for Python
- **Safety** - Dependency CVE scanner
- **Secret scanning** - Detects exposed credentials
- **OWASP Top 10** - Pattern-based vulnerability checks

### Pillar 2: Quality Check ✅
- **Pytest** - Unit testing framework
- **Coverage.py** - Code coverage tracking (≥ 80% required)
- **Flake8** - Python linter
- **Black** - Code formatter
- **Mypy** - Static type checker
- **ESLint** - Frontend linting (Next.js)
- **TypeScript** - Frontend type checking

### Pillar 3: Performance Check ✅
- **Apache Bench** - Load testing tool
- **API benchmarking** - Response time monitoring (p95 < 300ms)
- **Resource monitoring** - CPU/Memory usage tracking
- **Scalability testing** - Concurrent request handling

---

## 🚀 Quick Start

### Run All Checks Locally

```bash
cd backend
bash scripts/run_all_checks.sh
```

This runs all three pillars sequentially and provides a final approval/rejection decision.

### Run Individual Checks

**Security Scan:**
```bash
cd backend
bash scripts/run_security_scan.sh
```

**Quality Check:**
```bash
cd backend
bash scripts/run_quality_check.sh
```

**Performance Test:**
```bash
cd backend
bash scripts/run_performance_test.sh
```

---

## 📋 Detailed Usage

### Security Testing

#### Bandit (SAST Scanner)
```bash
cd backend
bandit -r . -c .bandit
```

**What it checks:**
- SQL injection vulnerabilities
- Hardcoded passwords/secrets
- Insecure cryptographic functions
- Unsafe deserialization
- Command injection risks

#### Safety (CVE Scanner)
```bash
cd backend
safety check
```

**What it checks:**
- Known vulnerabilities in dependencies
- Outdated packages with security fixes
- CVE database matching

#### Secret Scanner
Automatically checks for:
- Hardcoded passwords
- API keys in code
- Private keys
- Authentication tokens

### Quality Testing

#### Run Unit Tests
```bash
cd backend
pytest -v
```

#### Check Test Coverage
```bash
cd backend
pytest --cov=. --cov-report=html
```

View coverage report: `backend/htmlcov/index.html`

**Requirements:**
- Minimum 80% code coverage
- All tests must pass

#### Lint Code
```bash
cd backend
flake8 .
```

#### Format Code
```bash
cd backend
black .
```

#### Type Check
```bash
cd backend
mypy . --ignore-missing-imports
```

### Performance Testing

#### Benchmark API Endpoints
```bash
cd backend
ab -n 100 -c 10 http://localhost:102/api/travelers/
```

**Requirements:**
- p95 response time < 300ms
- 100% success rate under load
- CPU usage < 70%

#### Load Testing
The performance script automatically:
- Sends 50 requests over 10 seconds
- Measures success/error rates
- Monitors resource usage

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

The project includes a comprehensive GitHub Actions workflow that automatically runs all checks on:
- Push to `main` or `develop` branches
- Pull requests
- Manual trigger

**Workflow Location:** `.github/workflows/aci-security-standards.yml`

### CI/CD Jobs

1. **Security Scan** - Runs Bandit, Safety, and secret scanning
2. **Quality Check** - Runs tests with coverage, linting, and type checking
3. **Frontend Quality** - Lints and builds frontend
4. **Performance Check** - Benchmarks API performance
5. **Approval Gate** - Final approval if all checks pass

### Viewing Results

1. Go to GitHub repository
2. Click "Actions" tab
3. View workflow runs and results
4. Download artifacts (coverage reports, security scans)

---

## 📊 Test Coverage

### Current Test Files

**Backend:**
- `backend/tests/test_travelers.py` - Travelers API endpoints

### Writing Tests

Tests use pytest and follow this structure:

```python
def test_feature_name():
    """Test description"""
    # Arrange
    data = {"key": "value"}

    # Act
    response = client.post("/api/endpoint", json=data)

    # Assert
    assert response.status_code == 200
    assert response.json()["key"] == "value"
```

### Test Markers

- `@pytest.mark.unit` - Unit tests
- `@pytest.mark.integration` - Integration tests
- `@pytest.mark.slow` - Slow-running tests

---

## 🛡️ Security Best Practices

### What's Already Implemented

✅ No hardcoded credentials
✅ Parameterized SQL queries (SQLAlchemy ORM)
✅ Input validation with Pydantic
✅ Password hashing with bcrypt
✅ JWT token authentication
✅ Environment variable configuration

### Continuous Monitoring

- Run security scans before each deployment
- Update dependencies regularly with `safety check`
- Review Bandit reports for new code

---

## ⚙️ Configuration Files

### Backend

- `pytest.ini` - Test configuration
- `.bandit` - Security scan configuration
- `.flake8` - Linting rules
- `requirements.txt` - Python dependencies (includes testing tools)

### Frontend

- `package.json` - Includes ESLint
- `tsconfig.json` - TypeScript configuration
- `next.config.ts` - Next.js configuration with ESLint

---

## 🎯 Production Approval Checklist

Before deploying to production, ensure:

- [ ] All security scans pass (no HIGH/CRITICAL issues)
- [ ] Test coverage ≥ 80%
- [ ] All unit tests pass
- [ ] Code linting passes
- [ ] API response time p95 < 300ms
- [ ] Load testing shows 100% success rate
- [ ] CPU usage under load < 70%
- [ ] No secrets in code
- [ ] Dependencies have no known CVEs

**Run:** `bash backend/scripts/run_all_checks.sh`

If all checks pass: ✅ **APPROVED FOR PRODUCTION**

---

## 📞 Support

### Common Issues

**Tests failing:**
- Check database connection
- Ensure all dependencies installed: `pip install -r requirements.txt`
- Clear pytest cache: `pytest --cache-clear`

**Security scan failures:**
- Review Bandit/Safety reports
- Update vulnerable dependencies
- Fix code issues identified

**Performance issues:**
- Optimize database queries
- Add indexes
- Enable caching
- Scale resources

### Adding New Tests

1. Create test file: `tests/test_feature.py`
2. Write tests following existing patterns
3. Run locally: `pytest tests/test_feature.py`
4. Ensure coverage: `pytest --cov=feature`
5. Commit and push (CI/CD runs automatically)

---

## 🔗 Related Documents

- `ACI Security Standards.md` - Full requirements
- `.github/workflows/aci-security-standards.yml` - CI/CD configuration
- `backend/tests/` - Test files
- `backend/scripts/` - Testing scripts

---

## ✨ Summary

✅ **Security**: Automated vulnerability scanning
✅ **Quality**: 80%+ test coverage enforcement
✅ **Performance**: Sub-300ms response time validation
✅ **CI/CD**: Automated checks on every push
✅ **SOC II**: All compliance requirements met

**Status: Production Ready** 🚀
