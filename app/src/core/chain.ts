import { amounts } from 'micro-eth-signer';

export const CHAIN_ID = 56n;

export const MOVN = '0x200b63AA750c901892d4DCf82439860F9C270274';
export const MOVN_DECIMALS = 18;

export const WBMB = '0x9E4c611B834672c3643D9818249366bf65ae4C86';
export const WBMB_DECIMALS = 8;

export const GWEI = amounts.GWEI;

// Refuse to sign above this. BSC was at 0.05 gwei on 2026-10-16; MobickOne
// asks for 1.5 gwei (2026-11-28).
export const MAX_GAS_PRICE = 3n * GWEI;
