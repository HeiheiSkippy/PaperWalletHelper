import { Transaction } from 'micro-eth-signer';
import { sameAddress } from '../address';
import { Client } from '../rpc';
import { EvmError, readSend } from './send';
import { EvmSignature } from './sign';

export type EvmFinal = { raw: string; hash: string };

// Attaches the signer's signature to the transaction this app built and
// checks it recovers to the paper wallet that should be sending.
export function attachSignature(unsigned: Uint8Array, signature: EvmSignature, from: string): EvmFinal {
  readSend(unsigned);
  const tx = Transaction.fromBytes(unsigned);
  let signed: ReturnType<typeof Transaction.fromBytes>;
  try {
    signed = new Transaction('legacy', { ...(tx.raw as object), ...signature } as never, {
      allowSignatureFields: true,
    });
  } catch (e) {
    throw new EvmError('signature', String((e as Error)?.message ?? e));
  }
  if (!signed.verifySignature() || !sameAddress(signed.sender, from)) {
    throw new EvmError('wrong-key', 'signature does not belong to the sending wallet');
  }
  return { raw: signed.toHex(), hash: signed.hash };
}

export async function sendSigned(
  client: Client,
  unsigned: Uint8Array,
  signature: EvmSignature,
  from: string,
): Promise<string> {
  const { raw, hash } = attachSignature(unsigned, signature, from);
  return client.send(raw, hash);
}
