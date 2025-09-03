import jwt from "jsonwebtoken";

// export const generateToken = async (user, secret, expiresIn) => {
export const generateToken = async (user, secret, tokenFor) => {
    const { id, email, userName } = user;

    return await jwt.sign({ id, email, userName, type: tokenFor }, secret);
    // return await jwt.sign({ id }, secret, { expiresIn });
};