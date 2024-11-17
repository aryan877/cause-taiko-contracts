# Transparent Donation Tracker

A blockchain-based platform for transparent charitable donations with real-time tracking and NFT rewards.

## Features

- Create and manage charitable causes
- Track donations with milestones
- Award NFT badges to donors
- Calculate impact scores
- Real-time fund tracking
- Transparent withdrawal system

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file:

```
PRIVATE_KEY=your_private_key_here
```

3. Run tests:

```bash
npx hardhat test
```

4. Deploy to Taiko testnet:

```bash
npx hardhat run scripts/deploy-taiko.ts --network taiko-hekla
```

## Testing

Run the test suite:

```bash
npx hardhat test
```

For gas reporting:

```bash
REPORT_GAS=true npx hardhat test
```

## Goldsky Integration

The contract emits the following events for Goldsky indexing:

- CauseCreated
- DonationReceived
- MilestoneAdded
- MilestoneCompleted
- BadgeEarned
- FundsWithdrawn
- CauseTargetReached
- ImpactScoreUpdated

## Security

This contract includes:

- ReentrancyGuard for all external functions
- Ownable for administrative functions
- Safe withdrawal pattern
- Comprehensive event logging

## License

MIT
