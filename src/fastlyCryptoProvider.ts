import { ICryptoProvider } from '@queue-it/connector-javascript';
import { hmacString } from './helpers/crypto';

export class FastlyCryptoProvider implements ICryptoProvider {
    getSha256Hash(secretKey: string, plaintext: string): string {
        return hmacString(secretKey, plaintext);
    }
}
