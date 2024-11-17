// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TransparentDonationTracker
 * @notice A platform for transparent charitable donations with real-time tracking and NFT rewards
 */
contract TransparentDonationTracker is
    ERC721Enumerable,
    Ownable,
    ReentrancyGuard
{
    struct Cause {
        bytes32 id;
        string name;
        string description;
        address payable beneficiary;
        uint256 targetAmount;
        uint256 currentAmount;
        uint256 donorCount;
        bool isActive;
        bool targetReached;
    }

    struct Donation {
        uint256 amount;
        address donor;
        uint256 timestamp;
        bytes32 causeId;
        string causeName;
        uint256 impactScore;
    }

    struct Milestone {
        string description;
        uint256 targetAmount;
        bool isCompleted;
        uint256 completionTime;
    }

    // State variables
    uint256 private _tokenIdCounter;
    uint256 public totalDonations;
    mapping(bytes32 => Cause) public causesById;
    mapping(string => bytes32) public causeNameToId;
    mapping(bytes32 => Milestone[]) public causeMilestones;
    mapping(address => Donation[]) public donorHistory;
    mapping(bytes32 => mapping(address => uint256)) public causeDonorAmount;

    // Badge thresholds
    uint256 public constant BRONZE_THRESHOLD = 0.1 ether;
    uint256 public constant SILVER_THRESHOLD = 0.5 ether;
    uint256 public constant GOLD_THRESHOLD = 1 ether;
    uint256 public constant DIAMOND_THRESHOLD = 5 ether;

    // Badge tracking
    mapping(address => bool) public hasBronzeBadge;
    mapping(address => bool) public hasSilverBadge;
    mapping(address => bool) public hasGoldBadge;
    mapping(address => bool) public hasDiamondBadge;

    // Impact scoring
    mapping(address => uint256) public donorImpactScore;

    // Events for indexing
    event CauseCreated(
        bytes32 indexed causeId,
        string causeName,
        string description,
        address beneficiary,
        uint256 targetAmount
    );

    event DonationReceived(
        address indexed donor,
        bytes32 indexed causeId,
        string causeName,
        uint256 amount,
        uint256 impactScore,
        uint256 timestamp
    );

    event MilestoneAdded(
        bytes32 indexed causeId,
        string causeName,
        string description,
        uint256 targetAmount
    );

    event MilestoneCompleted(
        bytes32 indexed causeId,
        string causeName,
        uint256 milestoneIndex,
        uint256 completionTime
    );

    event BadgeEarned(address indexed donor, string badgeType, uint256 tokenId);

    event FundsWithdrawn(
        bytes32 indexed causeId,
        string causeName,
        address beneficiary,
        uint256 amount
    );

    event CauseTargetReached(
        bytes32 indexed causeId,
        string causeName,
        uint256 finalAmount,
        uint256 donorCount
    );

    event ImpactScoreUpdated(
        address indexed donor,
        uint256 newScore,
        bytes32 indexed causeId,
        string causeName
    );

    constructor() ERC721("DonationBadge", "DBADGE") Ownable(msg.sender) {}

    /**
     * @notice Creates a new charitable cause
     * @param name Cause identifier
     * @param description Detailed description of the cause
     * @param beneficiary Address to receive donations
     * @param targetAmount Funding goal
     */
    function createCause(
        string calldata name,
        string calldata description,
        address payable beneficiary,
        uint256 targetAmount
    ) external onlyOwner {
        require(causeNameToId[name] == bytes32(0), "Cause already exists");
        require(targetAmount > 0, "Target amount must be positive");
        require(beneficiary != address(0), "Invalid beneficiary");

        bytes32 causeId = keccak256(abi.encodePacked(name, block.timestamp));

        Cause memory newCause = Cause({
            id: causeId,
            name: name,
            description: description,
            beneficiary: beneficiary,
            targetAmount: targetAmount,
            currentAmount: 0,
            donorCount: 0,
            isActive: true,
            targetReached: false
        });

        causesById[causeId] = newCause;
        causeNameToId[name] = causeId;

        emit CauseCreated(
            causeId,
            name,
            description,
            beneficiary,
            targetAmount
        );
    }

    /**
     * @notice Adds milestone for tracking cause progress
     * @param causeId Cause identifier
     * @param description Milestone description
     * @param targetAmount Amount needed to reach milestone
     */
    function addMilestone(
        bytes32 causeId,
        string calldata description,
        uint256 targetAmount
    ) external onlyOwner {
        require(causesById[causeId].id != bytes32(0), "Cause does not exist");

        causeMilestones[causeId].push(
            Milestone({
                description: description,
                targetAmount: targetAmount,
                isCompleted: false,
                completionTime: 0
            })
        );

        emit MilestoneAdded(
            causeId,
            causesById[causeId].name,
            description,
            targetAmount
        );
    }

    /**
     * @notice Make a donation to a specific cause
     * @param causeId Cause identifier
     */
    function donate(bytes32 causeId) external payable nonReentrant {
        require(causesById[causeId].id != bytes32(0), "Cause does not exist");
        require(msg.value > 0, "Donation must be positive");

        Cause storage selectedCause = causesById[causeId];
        require(selectedCause.isActive, "Cause is inactive");
        require(!selectedCause.targetReached, "Cause target already reached");

        // Update cause statistics
        if (causeDonorAmount[causeId][msg.sender] == 0) {
            selectedCause.donorCount++;
        }

        selectedCause.currentAmount += msg.value;
        causeDonorAmount[causeId][msg.sender] += msg.value;
        totalDonations += msg.value;

        uint256 impactScore = (msg.value * 100) / 1 ether;
        donorImpactScore[msg.sender] += impactScore;

        donorHistory[msg.sender].push(
            Donation({
                amount: msg.value,
                donor: msg.sender,
                timestamp: block.timestamp,
                causeId: causeId,
                causeName: selectedCause.name,
                impactScore: impactScore
            })
        );

        _checkAndUpdateMilestones(causeId, selectedCause.name);

        if (selectedCause.currentAmount >= selectedCause.targetAmount) {
            selectedCause.targetReached = true;
            emit CauseTargetReached(
                causeId,
                selectedCause.name,
                selectedCause.currentAmount,
                selectedCause.donorCount
            );
        }

        _checkAndAwardBadges(msg.sender);

        emit DonationReceived(
            msg.sender,
            causeId,
            selectedCause.name,
            msg.value,
            impactScore,
            block.timestamp
        );

        emit ImpactScoreUpdated(
            msg.sender,
            donorImpactScore[msg.sender],
            causeId,
            selectedCause.name
        );
    }

    /**
     * @notice Withdraw funds for a specific cause
     * @param causeId Cause identifier
     */
    function withdrawFunds(bytes32 causeId) external nonReentrant {
        require(causesById[causeId].id != bytes32(0), "Cause does not exist");

        Cause storage selectedCause = causesById[causeId];
        require(msg.sender == selectedCause.beneficiary, "Not beneficiary");
        require(selectedCause.currentAmount > 0, "No funds to withdraw");

        uint256 amount = selectedCause.currentAmount;
        selectedCause.currentAmount = 0;

        (bool success, ) = selectedCause.beneficiary.call{value: amount}("");
        require(success, "Transfer failed");

        emit FundsWithdrawn(
            causeId,
            selectedCause.name,
            selectedCause.beneficiary,
            amount
        );
    }

    // Internal functions
    function _checkAndUpdateMilestones(
        bytes32 causeId,
        string memory causeName
    ) internal {
        Milestone[] storage milestones = causeMilestones[causeId];
        uint256 currentAmount = causesById[causeId].currentAmount;

        for (uint256 i = 0; i < milestones.length; i++) {
            if (
                !milestones[i].isCompleted &&
                currentAmount >= milestones[i].targetAmount
            ) {
                milestones[i].isCompleted = true;
                milestones[i].completionTime = block.timestamp;
                emit MilestoneCompleted(causeId, causeName, i, block.timestamp);
            }
        }
    }

    function _checkAndAwardBadges(address donor) internal {
        uint256 totalDonated = 0;
        Donation[] memory donations = donorHistory[donor];

        for (uint256 i = 0; i < donations.length; i++) {
            totalDonated += donations[i].amount;
        }

        if (totalDonated >= DIAMOND_THRESHOLD && !hasDiamondBadge[donor]) {
            _mintBadge(donor, "DIAMOND");
            hasDiamondBadge[donor] = true;
        } else if (totalDonated >= GOLD_THRESHOLD && !hasGoldBadge[donor]) {
            _mintBadge(donor, "GOLD");
            hasGoldBadge[donor] = true;
        } else if (totalDonated >= SILVER_THRESHOLD && !hasSilverBadge[donor]) {
            _mintBadge(donor, "SILVER");
            hasSilverBadge[donor] = true;
        } else if (totalDonated >= BRONZE_THRESHOLD && !hasBronzeBadge[donor]) {
            _mintBadge(donor, "BRONZE");
            hasBronzeBadge[donor] = true;
        }
    }

    function _mintBadge(address donor, string memory badgeType) internal {
        uint256 tokenId = _tokenIdCounter;
        _safeMint(donor, tokenId);
        _tokenIdCounter++;

        emit BadgeEarned(donor, badgeType, tokenId);
    }

    function getDonorHistory(
        address donor
    ) external view returns (Donation[] memory) {
        return donorHistory[donor];
    }

    function getCauseMilestones(
        bytes32 causeId
    ) external view returns (Milestone[] memory) {
        require(causesById[causeId].id != bytes32(0), "Cause does not exist");

        return causeMilestones[causeId];
    }

    function getDonorImpactScore(
        address donor
    ) external view returns (uint256) {
        return donorImpactScore[donor];
    }
}
