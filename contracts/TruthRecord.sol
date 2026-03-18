// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract TruthRecord {
    struct Record {
        string headline;
        bool verdict;
        uint256 timestamp;
    }

    Record[] private records;

    event RecordAdded(address indexed caller, string headline, bool verdict, uint256 timestamp);

    function addRecord(string calldata headline, bool verdict, uint256 timestamp) external {
        records.push(Record(headline, verdict, timestamp));
        emit RecordAdded(msg.sender, headline, verdict, timestamp);
    }

    function getAllRecords() external view returns (Record[] memory) {
        return records;
    }

    function getCount() external view returns (uint256) {
        return records.length;
    }
}
