
import assert from 'node:assert';
import { validateCardLogic } from './card-validation.utils';

function runTests() {
    console.log('Running Card Verification Logic Tests...');

    // 1. Visa
    {
        const res = validateCardLogic('4111111111111111', '12/99', '123');
        assert.strictEqual(res.cardType, 'visa', 'Visa check failed');
        assert.strictEqual(res.isCardNumValid, true, 'Visa length check failed');
        assert.strictEqual(res.isCvvValid, true, 'Visa CVV check failed');
        assert.strictEqual(res.isValid, true, 'Visa valid check failed');
    }

    // 2. MasterCard
    {
        const res = validateCardLogic('5100000000000000', '12/99', '123');
        assert.strictEqual(res.cardType, 'mastercard', 'MasterCard check failed');
        assert.strictEqual(res.isCardNumValid, true, 'MasterCard length check failed');
    }

    // 3. Amex (15 digits, 4 digit CVV)
    {
        const res = validateCardLogic('340000000000000', '12/99', '1234');
        assert.strictEqual(res.cardType, 'amex', 'Amex check failed');
        assert.strictEqual(res.isCardNumValid, true, 'Amex length check failed');
        assert.strictEqual(res.isCvvValid, true, 'Amex CVV check failed');
    }

    // 4. Invalid Length (Visa)
    {
        const res = validateCardLogic('4111', '12/99', '123');
        assert.strictEqual(res.cardType, 'visa', 'Visa type check failed (short)');
        assert.strictEqual(res.isCardNumValid, false, 'Invalid length check failed');
        assert.strictEqual(res.isValid, false, 'Should be invalid due to length');
    }

    // 5. Invalid CVV (Amex requires 4)
    {
        const res = validateCardLogic('340000000000000', '12/99', '123');
        assert.strictEqual(res.cardType, 'amex');
        assert.strictEqual(res.isCvvValid, false, 'Amex invalid CVV check failed');
    }

    // 6. Expiry (Past)
    {
        const res = validateCardLogic('4111111111111111', '01/20', '123'); // 2020
        assert.strictEqual(res.isExpiryValid, false, 'Past expiry check failed');
        assert.strictEqual(res.isValid, false, 'Should be invalid due to expiry');
    }

    console.log('All tests passed!');
}

try {
    runTests();
} catch (e) {
    console.error('Test Failed:', e);
    process.exit(1);
}
