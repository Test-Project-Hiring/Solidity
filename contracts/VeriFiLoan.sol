// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title VeriFiLoan — on-chain loan registry
/// @notice Hiring task (~10–15 min): implement `recordPayment`.
///         Instructions are in the repo README under "Your task".
///         Do not edit the tests.
contract VeriFiLoan {
    // Status is the lifecycle of a loan. Do not renumber existing values.
    uint8 public constant STATUS_PENDING = 0;
    uint8 public constant STATUS_APPROVED = 1;
    uint8 public constant STATUS_DISBURSED = 2;
    uint8 public constant STATUS_REPAID = 3;
    uint8 public constant STATUS_DEFAULTED = 4;
    uint8 public constant STATUS_REJECTED = 5;

    /// @dev Loan is one registered loan. Do not add, remove, or reorder fields.
    struct Loan {
        bytes32 offChainId;
        address borrower;
        uint256 amountCents;
        uint256 interestRateBps;
        uint256 termMonths;
        uint256 monthlyPaymentCents;
        uint8 status;
        uint64 createdAt;
        uint64 approvedAt;
        uint64 disbursedAt;
    }

    /// @dev Payment is one successful repayment. recordPayment appends these.
    struct Payment {
        uint256 loanId;
        address payer;
        uint256 amountCents;
        uint256 remainingCents;
    }

    error Unauthorized();
    error InvalidAddress();
    error InvalidAmount();
    error LoanExists();
    error LoanNotFound();
    error InvalidStatusTransition();

    address public owner;
    address public platform;
    uint256 public nextLoanId = 1;

    mapping(uint256 => Loan) private _loans;
    mapping(uint256 => uint256) private _remaining;
    mapping(bytes32 => uint256) public offChainIdToLoanId;
    mapping(address => uint256[]) private _borrowerLoans;

    /// @notice Repayment log, in call order.
    Payment[] public payments;

    event LoanCreated(
        uint256 indexed loanId,
        bytes32 indexed offChainId,
        address indexed borrower,
        uint256 amountCents,
        uint256 interestRateBps,
        uint256 termMonths
    );
    event LoanStatusUpdated(uint256 indexed loanId, uint8 previousStatus, uint8 newStatus);
    event PaymentRecorded(
        uint256 indexed loanId,
        address indexed payer,
        uint256 amountCents,
        uint256 remainingCents
    );

    constructor(address initialPlatform) {
        if (initialPlatform == address(0)) revert InvalidAddress();
        owner = msg.sender;
        platform = initialPlatform;
    }

    modifier onlyPlatform() {
        if (!_isPlatform(msg.sender)) revert Unauthorized();
        _;
    }

    /// @notice Registers a pending loan. Caller must be owner or platform.
    function createLoan(
        bytes32 offChainId,
        address borrower,
        uint256 amountCents,
        uint256 interestRateBps,
        uint256 termMonths,
        uint256 monthlyPaymentCents
    ) external onlyPlatform returns (uint256 loanId) {
        if (borrower == address(0)) revert InvalidAddress();
        if (amountCents == 0 || termMonths == 0) revert InvalidAmount();
        if (offChainIdToLoanId[offChainId] != 0) revert LoanExists();

        loanId = nextLoanId++;
        _loans[loanId] = Loan({
            offChainId: offChainId,
            borrower: borrower,
            amountCents: amountCents,
            interestRateBps: interestRateBps,
            termMonths: termMonths,
            monthlyPaymentCents: monthlyPaymentCents,
            status: STATUS_PENDING,
            createdAt: uint64(block.timestamp),
            approvedAt: 0,
            disbursedAt: 0
        });
        offChainIdToLoanId[offChainId] = loanId;
        _borrowerLoans[borrower].push(loanId);
        _remaining[loanId] = amountCents;

        emit LoanCreated(loanId, offChainId, borrower, amountCents, interestRateBps, termMonths);
    }

    /// @notice Moves Pending -> Approved.
    function approveLoan(uint256 loanId) external onlyPlatform {
        _transition(loanId, STATUS_PENDING, STATUS_APPROVED);
        _loans[loanId].approvedAt = uint64(block.timestamp);
    }

    /// @notice Moves Approved -> Disbursed.
    function disburseLoan(uint256 loanId) external onlyPlatform {
        _transition(loanId, STATUS_APPROVED, STATUS_DISBURSED);
        _loans[loanId].disbursedAt = uint64(block.timestamp);
    }

    /// @notice Moves Pending -> Rejected.
    function rejectLoan(uint256 loanId) external onlyPlatform {
        _transition(loanId, STATUS_PENDING, STATUS_REJECTED);
    }

    /// @notice Moves Disbursed -> Repaid and clears the outstanding balance.
    function markRepaid(uint256 loanId) external onlyPlatform {
        _transition(loanId, STATUS_DISBURSED, STATUS_REPAID);
        _remaining[loanId] = 0;
    }

    /// @notice Moves Disbursed -> Defaulted.
    function markDefaulted(uint256 loanId) external onlyPlatform {
        _transition(loanId, STATUS_DISBURSED, STATUS_DEFAULTED);
    }

    /// @notice Records a repayment against a disbursed loan. See README "Your task".
    function recordPayment(uint256 loanId, uint256 amountCents) external {
        // TODO: candidate implements
        loanId;
        amountCents;
        revert("TODO");
    }

    /// @notice Outstanding balance in cents.
    function remainingOf(uint256 loanId) external view returns (uint256) {
        Loan storage ln = _loans[loanId];
        if (ln.borrower == address(0)) revert LoanNotFound();
        return _remaining[loanId];
    }

    function getLoan(uint256 loanId) external view returns (Loan memory) {
        Loan memory ln = _loans[loanId];
        if (ln.borrower == address(0)) revert LoanNotFound();
        return ln;
    }

    function getBorrowerLoans(address borrower) external view returns (uint256[] memory) {
        return _borrowerLoans[borrower];
    }

    function paymentCount() external view returns (uint256) {
        return payments.length;
    }

    function _isPlatform(address caller) internal view returns (bool) {
        return caller == platform || caller == owner;
    }

    function _transition(uint256 loanId, uint8 expected, uint8 next) internal {
        Loan storage ln = _loans[loanId];
        if (ln.borrower == address(0)) revert LoanNotFound();
        if (ln.status != expected) revert InvalidStatusTransition();
        uint8 previous = ln.status;
        ln.status = next;
        emit LoanStatusUpdated(loanId, previous, next);
    }
}
