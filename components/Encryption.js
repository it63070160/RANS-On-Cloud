import { AES, enc } from "crypto-js";
import { secretKey } from "../constants/key";

export function encrypt(input){
    const cipherText = AES.encrypt(input, secretKey).toString()
    return cipherText;
}

export function decrypt(input){
    const plainText = AES.decrypt(input, secretKey).toString(enc.Utf8)
    return plainText;
}