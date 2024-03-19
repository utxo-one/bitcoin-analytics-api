import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class AddressService {
  constructor(private readonly dataSource: DataSource) {}

  async getAddressSummary(addressObj): Promise<any> {
    const address = addressObj.address;

    const query = `
    WITH Received AS (
        SELECT
            o.transactionId,
            SUM(o.value) AS total_received
        FROM
            transaction_outputs o
        WHERE
            o.scriptPubKeyAddress = ?
        GROUP BY
            o.transactionId
    ),
    Spent AS (
        SELECT
            i.transactionId,
            SUM(o.value) AS total_spent
        FROM
            transaction_inputs i
        JOIN transaction_outputs o ON i.transactionId = o.transactionId AND i.vout = o.n
        WHERE
            o.scriptPubKeyAddress = ?
        GROUP BY
            i.transactionId
    ),
    TransactionDetails AS (
        SELECT
            t.id AS transactionId,
            t.txid,
            t.hash,
            t.size,
            t.vsize,
            t.weight,
            t.locktime,
            t.blockhash,
            b.height,
            b.time AS blocktime,
            COALESCE(r.total_received, 0) - COALESCE(s.total_spent, 0) AS balance
        FROM
            transactions t
        JOIN blocks b ON t.blockhash = b.hash
        LEFT JOIN Received r ON t.id = r.transactionId
        LEFT JOIN Spent s ON t.id = s.transactionId
        WHERE
            t.id IN (SELECT transactionId FROM Received UNION SELECT transactionId FROM Spent)
    )
    SELECT
        JSON_OBJECT(
            'address', ?,
            'height', d.height,
            'balance', d.balance,
            'transaction', JSON_OBJECT(
                'id', d.transactionId,
                'txid', d.txid,
                'hash', d.hash,
                'size', d.size,
                'vsize', d.vsize,
                'weight', d.weight,
                'locktime', d.locktime,
                'blockhash', d.blockhash,
                'confirmations', 1,  -- This needs dynamic calculation based on the current blockchain height
                'time', d.blocktime,
                'blocktime', d.blocktime,
                'vin', (SELECT JSON_ARRAYAGG(
                            JSON_OBJECT(
                                'txid', i.txid,
                                'vout', JSON_OBJECT(
                                    'value', o.value,
                                    'n', o.n,
                                    'scriptPubKeyAsm', o.scriptPubKeyAsm,
                                    'scriptPubKeyHex', o.scriptPubKeyHex,
                                    'scriptPubKeyType', o.scriptPubKeyType,
                                    'scriptPubKeyDesc', o.scriptPubKeyDesc,
                                    'scriptPubKeyAddress', o.scriptPubKeyAddress
                                )
                            )
                        )
                        FROM transaction_inputs i
                        JOIN transaction_outputs o ON i.transactionId = o.transactionId AND i.vout = o.n
                        WHERE i.transactionId = d.transactionId),
                'vout', (SELECT JSON_ARRAYAGG(
                             JSON_OBJECT(
                                 'value', o.value,
                                 'n', o.n,
                                 'scriptPubKeyAsm', o.scriptPubKeyAsm,
                                 'scriptPubKeyHex', o.scriptPubKeyHex,
                                 'scriptPubKeyType', o.scriptPubKeyType,
                                 'scriptPubKeyDesc', o.scriptPubKeyDesc,
                                 'scriptPubKeyAddress', o.scriptPubKeyAddress
                             )
                         )
                         FROM transaction_outputs o
                         WHERE o.transactionId = d.transactionId)
            )
        ) AS summary
    FROM
        TransactionDetails d
    `;

    const parameters = [address, address, address, address];

    const rawResults = await this.dataSource.query(query, parameters);

    return rawResults.map((row) => row.summary);
  }
}
