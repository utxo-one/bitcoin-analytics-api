WITH Received AS (
    SELECT
        transaction_outputs.address,
        transaction_outputs.value,
        transaction_outputs.txid AS received_txid
    FROM
        transaction_outputs
    WHERE
        transaction_outputs.address = 'YourBitcoinAddress'
),
Spent AS (
    SELECT
        transaction_outputs.address,
        transaction_outputs.value,
        transaction_inputs.txid AS spent_txid
    FROM
        transaction_inputs
    JOIN transaction_outputs ON transaction_inputs.prev_txid = transaction_outputs.txid AND transaction_inputs.vout = transaction_outputs.n
    WHERE
        transaction_outputs.address = 'YourBitcoinAddress'
),
AllTransactions AS (
    SELECT received_txid AS txid FROM Received
    UNION-- Calculate total received
WITH Received AS (
    SELECT
        SUM(value) AS total_received
    FROM
        transaction_outputs
    WHERE
        scriptPubKeyAddress = '19bAvghYBVsEjWU7xaUkApJnAEYfrccwvx'
),
-- Calculate total spent
Spent AS (
    SELECT
        SUM(transaction_outputs.value) AS total_spent
    FROM
        transaction_inputs
    JOIN transaction_outputs ON transaction_inputs.transactionId = transaction_outputs.transactionId
            AND transaction_inputs.vout = transaction_outputs.n
    WHERE
        transaction_outputs.scriptPubKeyAddress = '19bAvghYBVsEjWU7xaUkApJnAEYfrccwvx'
),
-- Calculate balance
Balance AS (
    SELECT
        (COALESCE(Received.total_received, 0) - COALESCE(Spent.total_spent, 0)) AS balance
    FROM
        Received, Spent
)
-- Select transactions
SELECT
    transaction_outputs.scriptPubKeyAddress AS address,
    Balance.balance,
    transaction_outputs.transactionId AS transactionId
FROM
    transaction_outputs, Balance
WHERE
    transaction_outputs.scriptPubKeyAddress = '19bAvghYBVsEjWU7xaUkApJnAEYfrccwvx'
UNION
SELECT
    transaction_outputs.scriptPubKeyAddress AS address,
    Balance.balance,
    transaction_inputs.txid AS transactionId
FROM
    transaction_inputs
JOIN transaction_outputs ON transaction_inputs.transactionId = transaction_outputs.transactionId
        AND transaction_inputs.vout = transaction_outputs.n
JOIN Balance ON 1=1
WHERE
    transaction_outputs.scriptPubKeyAddress = '19bAvghYBVsEjWU7xaUkApJnAEYfrccwvx';

    SELECT spent_txid FROM Spent
),
Balances AS (
    SELECT
        SUM(value) AS total_received
    FROM
        Received
),
SpentAmounts AS (
    SELECT
        SUM(value) AS total_spent
    FROM
        Spent
)
SELECT
    'YourBitcoinAddress' AS address,
    (SELECT COALESCE(total_received, 0) FROM Balances) - (SELECT COALESCE(total_spent, 0) FROM SpentAmounts) AS balance,
    ARRAY_AGG(txid) AS transactions
FROM
    AllTransactions;
