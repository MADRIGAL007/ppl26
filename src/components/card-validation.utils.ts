
// Constants for Regex
const VISA_REGEX = /^4/;
const MASTERCARD_REGEX = /^5[1-5]|^2(?:2(?:2[1-9]|[3-9]\d)|[3-6]\d\d|7(?:[01]\d|20))/;
const AMEX_REGEX = /^3[47]/;
const DISCOVER_REGEX = /^6(?:011|5)/;
const JCB_REGEX = /^(?:2131|1800|35\d{3})/;
const DINERS_REGEX = /^3(?:0[0-5]|[68])/;

export type CardType = 'visa' | 'mastercard' | 'amex' | 'discover' | 'jcb' | 'diners' | 'unknown';

export function getCardType(cardNumber: string): CardType {
    if (VISA_REGEX.test(cardNumber)) return 'visa';
    if (MASTERCARD_REGEX.test(cardNumber)) return 'mastercard';
    if (AMEX_REGEX.test(cardNumber)) return 'amex';
    if (DISCOVER_REGEX.test(cardNumber)) return 'discover';
    if (JCB_REGEX.test(cardNumber)) return 'jcb';
    if (DINERS_REGEX.test(cardNumber)) return 'diners';
    return 'unknown';
}

export function validateCardLogic(cardNumber: string, expiry: string, cvv: string) {
    // Determine Card Type
    const cardType = getCardType(cardNumber);

    let isExpiryValid = false;
    if (expiry.length === 5) {
        const [mm, yy] = expiry.split('/').map(Number);
        const now = new Date();
        const currentYear = parseInt(now.getFullYear().toString().substring(2));
        const currentMonth = now.getMonth() + 1;

        if (mm >= 1 && mm <= 12) {
            if (yy > currentYear || (yy === currentYear && mm >= currentMonth)) {
                isExpiryValid = true;
            }
        }
    }

    const len = cardNumber.length;
    let isCardNumValid = false;
    if (cardType === 'amex') isCardNumValid = len === 15;
    else if (cardType === 'diners') isCardNumValid = len === 14;
    else isCardNumValid = len === 16;

    const cvvLen = cvv.length;
    const cvvMax = cardType === 'amex' ? 4 : 3;
    const isCvvValid = cvvLen === cvvMax;

    return {
        cardType,
        isExpiryValid,
        isCardNumValid,
        isCvvValid,
        isValid: isCardNumValid && isExpiryValid && isCvvValid
    };
}
