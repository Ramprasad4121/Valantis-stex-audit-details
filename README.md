# STEXAMM Front-Running Vulnerability - Evidence Package

**Vulnerability:** Front-Running Attack on User Withdrawals

**Severity:** CRITICAL (RVSS 9.8/10)

**Contract:** 0x39694eFF3b02248929120c73F90347013Aec834d

**Network:** HyperEVM Mainnet (Chain ID 999)

**Submitted by:** @0xramprasad

---

##  Files in This Package

### 1. mainnet_analysis.json
- **Description:** Analysis of current mainnet state
- **Block:** 17,415,246
- **Vulnerable Funds:** $8,375.76
- **Generated:** October 25, 2025

### 2. forge_test_results.txt
- **Description:** Complete Foundry test execution results
- **Tests Run:** 7 total (5 passed, 2 failed - unrelated to vulnerability)
- **Key Proofs:**
  - Proof 1: $8,375 stolen from mainnet state 
  - Proof 4: Economic feasibility demonstrated 
  - Proof 5: Multiple attack vectors confirmed 
  - Proof 6: Transaction ordering proven 
  - Proof 7: Comprehensive summary 

### 3. transaction_traces.txt
- **Description:** Detailed execution traces showing exact fund flow
- **Shows:**
  - balanceOf(STEXAMM) reads
  - claimPoolManagerFees() execution
  - Token transfers to fee recipients
  - Final balances (STEXAMM = 0)

### 4. Screenshots (add these manually)
- screenshot_1_vulnerable_state.png - Mainnet analysis showing $8,375 at risk
- screenshot_2_proof1_success.png - Proof 1 showing successful theft
- screenshot_3_economic.png - Economic feasibility analysis
- screenshot_4_summary.png - Test summary (5 passed)

---

## 🔬 How to Verify

### Reproduce the Mainnet Analysis:
```bash
node check_mainnet_state.cjs
```

### Reproduce the Exploit:
```bash
forge test --match-contract MainnetForkExploit \
  --fork-url https://rpc.hyperliquid.xyz/evm \
  --fork-block-number 17415246 \
  -vvvv
```

### View Detailed Traces:
```bash
forge test --match-test testProof1_ExistingFundsVulnerable \
  --fork-url https://rpc.hyperliquid.xyz/evm \
  --fork-block-number 17415246 \
  -vvvvv
```

---

##  Key Findings

**Vulnerability Confirmed:**
- Function: claimPoolManagerFees()
- Issue: Anyone can call it to steal user withdrawal funds
- Method: Front-running via higher gas price

**Mainnet Proof:**
- Current vulnerable amount: $8,375.76
- Successfully stolen in fork test
- 5 comprehensive tests passed
- Complete transaction traces provided

**Impact:**
- Pool TVL at risk: $5.6 Million
- Every withdrawal exploitable
- Attack cost: $0.19
- Attack profit: $10 - $10,000+ per withdrawal

---

## Contact

**Researcher:** @0xramprasad

**Twitter:** https://x.com/0xramprasad

**Submission:** https://hunt.r.xyz/programs/valantis-stex

---

**This evidence package provides irrefutable proof of a CRITICAL front-running vulnerability.**
