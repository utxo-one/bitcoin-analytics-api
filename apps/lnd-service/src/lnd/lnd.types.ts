export type Feature = {
  bit: number;
  is_known: boolean;
  is_required: boolean;
  type?: string; // Optional as it may not always be present
};

export type NodeUpdated = {
  alias: string;
  color: string;
  features: Feature[];
  public_key: string;
  sockets: string[];
  updated_at: string; // Assuming ISO 8601 date string
};

export type ChannelUpdated = {
  base_fee_mtokens: string;
  capacity: number;
  cltv_delta: number;
  fee_rate: number;
  id: string;
  is_disabled: boolean;
  max_htlc_mtokens: string;
  min_htlc_mtokens: string;
  public_keys: string[];
  transaction_id: string;
  transaction_vout: number;
  updated_at: string; // ISO 8601 Date String
};

export type ChannelClosed = {
  capacity: number;
  close_height: number;
  id: string;
  transaction_id: string;
  transaction_vout: number;
  updated_at: string; // ISO 8601 Date String
};

export const isChannelClosed = (
  channel: ChannelUpdated | ChannelClosed,
): channel is ChannelClosed => {
  return (channel as ChannelClosed).close_height !== undefined;
};

export const isChannelUpdated = (
  channel: ChannelUpdated | ChannelClosed,
): channel is ChannelUpdated => {
  return (channel as ChannelUpdated).base_fee_mtokens !== undefined;
};
