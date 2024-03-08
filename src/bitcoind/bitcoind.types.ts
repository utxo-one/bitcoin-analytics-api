export interface RpcResponse<T> {
  result: T;
  error: null | { code: number; message: string };
  id: string;
}

export interface BlockchainInfo {
  chain: string;
  blocks: number;
  headers: number;
  bestblockhash: string;
  difficulty: number;
  mediantime: number;
  verificationprogress: number;
  initialblockdownload: boolean;
  chainwork: string;
  size_on_disk: number;
  pruned: boolean;
  softforks: any[]; // This can be detailed further based on your needs
  warnings: string;
}

export interface BlockStats {
  avgfee: number;
  avgfeerate: number;
  avgtxsize: number;
  blockhash: string;
  height: number;
  ins: number;
  maxfee: number;
  maxfeerate: number;
  maxtxsize: number;
  medianfee: number;
  mediantime: number;
  minfee: number;
  outs: number;
  subsidy: number;
  time: number;
  totalfee: number;
  txs: number;
  // Add other fields as needed
}

export interface ChainTxStats {
  time: number;
  txcount: number;
  window_block_count: number;
  window_final_block_hash: string;
  window_tx_count: number;
  window_interval: number;
  txrate: number;
}

export interface MempoolInfo {
  size: number;
  bytes: number;
  usage: number;
  maxmempool: number;
  mempoolminfee: number;
  minrelaytxfee: number;
}

export interface Block {
  hash: string;
  confirmations: number;
  strippedsize: number;
  size: number;
  weight: number;
  height: number;
  version: number;
  versionHex: string;
  merkleroot: string;
  tx: string[];
  time: number;
  mediantime: number;
  nonce: number;
  bits: string;
  difficulty: number;
  chainwork: string;
  nTx: number;
  previousblockhash: string;
  nextblockhash: string;
}

export interface Difficulty {
  data: number;
}

export interface BlockCount {
  data: number;
}

export interface RpcError {
  code: number;
  message: string;
}

export interface TransactionInput {
  txid: string;
  vout: number;
  scriptSig: {
    asm: string;
    hex: string;
  };
  sequence: number;
  coinbase?: string; // Add this field to your type
}

export interface TransactionOutput {
  value: number;
  n: number;
  scriptPubKey: {
    asm: string;
    hex: string;
    type: string;
    desc?: string; // Optional fields should be marked as such
    address?: string; // Assuming there can be multiple addresses
  };
}

export interface TransactionDetail {
  involvesWatchonly?: boolean;
  address: string;
  category: string;
  amount: number;
  label?: string;
  vout: number;
  fee?: number;
  abandoned?: boolean;
}

export interface Transaction {
  txid: string;
  hash: string;
  version: number;
  size: number;
  vsize: number;
  weight: number;
  locktime: number;
  vin: TransactionInput[];
  vout: TransactionOutput[];
  hex: string;
  blockhash: string;
  confirmations: number;
  time: number;
  blocktime: number;
  walletconflicts: string; // This should be an array based on the given RPC response
  comment?: string; // Optional fields should be marked as such
  bip125_replaceable: 'yes' | 'no' | 'unknown'; // Use literal types for known values
  details: TransactionDetail[];
}

export interface ScriptPubKey {
  asm: string;
  hex: string;
  desc?: string;
  type: string;
  address?: string;
}
