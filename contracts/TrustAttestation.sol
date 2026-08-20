// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title TrustAttestation — risk / trust attestations for borrowers
contract TrustAttestation {
    struct Attestation {
        address subject;
        uint256 riskScore;
        bytes32 decisionHash;
        bytes32 factorsHash;
        string modelVersion;
        uint64 attestedAt;
        address attester;
    }

    error Unauthorized();
    error InvalidAddress();

    address public owner;
    address public attester;
    uint256 public nextAttestationId = 1;

    mapping(uint256 => Attestation) private _attestations;
    mapping(address => uint256) public latestAttestationId;
    mapping(address => uint256[]) private _subjectAttestations;

    event TrustAttested(
        uint256 indexed attestationId,
        address indexed subject,
        uint256 riskScore,
        bytes32 decisionHash,
        string modelVersion
    );

    constructor(address initialAttester) {
        if (initialAttester == address(0)) revert InvalidAddress();
        owner = msg.sender;
        attester = initialAttester;
    }

    modifier onlyAttester() {
        if (msg.sender != attester && msg.sender != owner) revert Unauthorized();
        _;
    }

    function attest(
        address subject,
        uint256 riskScore,
        bytes32 decisionHash,
        bytes32 factorsHash,
        string calldata modelVersion
    ) external onlyAttester returns (uint256 attestationId) {
        if (subject == address(0)) revert InvalidAddress();

        attestationId = nextAttestationId++;
        _attestations[attestationId] = Attestation({
            subject: subject,
            riskScore: riskScore,
            decisionHash: decisionHash,
            factorsHash: factorsHash,
            modelVersion: modelVersion,
            attestedAt: uint64(block.timestamp),
            attester: msg.sender
        });
        latestAttestationId[subject] = attestationId;
        _subjectAttestations[subject].push(attestationId);

        emit TrustAttested(attestationId, subject, riskScore, decisionHash, modelVersion);
    }

    function getAttestation(uint256 attestationId) external view returns (Attestation memory) {
        Attestation memory a = _attestations[attestationId];
        if (a.subject == address(0)) revert InvalidAddress();
        return a;
    }

    function getLatestAttestation(address subject) external view returns (Attestation memory) {
        uint256 id = latestAttestationId[subject];
        if (id == 0) revert InvalidAddress();
        return _attestations[id];
    }

    function getSubjectAttestations(address subject) external view returns (uint256[] memory) {
        return _subjectAttestations[subject];
    }
}
