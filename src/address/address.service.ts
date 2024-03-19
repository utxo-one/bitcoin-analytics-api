import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class AddressService {
  constructor(private readonly dataSource: DataSource) {}

  async getAddressSummary(addressObj): Promise<any> {
    const address = addressObj.address;

    const query = `
    SELECT
        JSON_OBJECT(
            'address', ?,
            'transactions', (
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'id', t.id,
                        'txid', t.txid,
                        'hash', t.hash,
                        'size', t.size,
                        'vsize', t.vsize,
                        'weight', t.weight,
                        'locktime', t.locktime,
                        'blockId', t.blockId,
                        'time', b.time,
                        'blocktime', b.time,
                        'outputs', (
                            SELECT JSON_ARRAYAGG(
                                JSON_OBJECT(
                                    'value', o.value,
                                    'n', o.n,
                                    'scriptPubKeyAddress', o.scriptPubKeyAddress
                                )
                            )
                            FROM transaction_outputs o
                            WHERE o.transactionId = t.id
                        ),
                        'inputs', (
                            SELECT JSON_ARRAYAGG(
                                JSON_OBJECT(
                                    'value', prev_o.value,
                                    'n', prev_o.n,
                                    'scriptPubKeyAddress', prev_o.scriptPubKeyAddress
                                )
                            )
                            FROM transaction_inputs i
                            JOIN transaction_outputs prev_o ON i.txid = prev_o.transactionId AND i.vout = prev_o.n
                            WHERE i.transactionId = t.id AND prev_o.scriptPubKeyAddress = ?
                        )
                    )
                )
                FROM transactions t
                JOIN blocks b ON t.blockId = b.id
                WHERE t.id IN (
                    SELECT transactionId FROM transaction_outputs WHERE scriptPubKeyAddress = ?
                    UNION
                    SELECT i.transactionId FROM transaction_inputs i 
                    JOIN transaction_outputs o ON i.txid = o.transactionId AND i.vout = o.n
                    WHERE o.scriptPubKeyAddress = ?
                )
            )
        ) AS summary
    `;

    const parameters = [address, address, address, address];

    const rawResults = await this.dataSource.query(query, parameters);

    return rawResults.map((row) => row.summary);
  }
}
