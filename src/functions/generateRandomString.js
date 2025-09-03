
import crypto from 'crypto'


export const generateRandomString = (length) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    const randomValues = crypto.randomBytes(length);

    return Array.from(randomValues, (value) => characters[value % charactersLength]).join('');
};