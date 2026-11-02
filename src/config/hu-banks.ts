/**
 * Hungarian banks by the first three digits of the account number (pénzforgalmi irányítókód), with their BIC.
 * Sources: MNB "Hitelintézetek azonosító adatai" (GIRO codes) and the MNB VIBER member list (BIC), 2025.
 * Only codes whose current holder is certain are listed; for any other code we show the number as valid, without a bank.
 * Update when MNB publishes changes (mnb.hu → Pénzforgalom → Bankkódok, fiókkódok).
 */
export const HU_BANKS: Record<string, { name: string; bic: string | null }> = {
  "100": { name: "Magyar Államkincstár", bic: "HUSTHUHB" },
  "103": { name: "MBH Bank Nyrt.", bic: "MKKBHUHB" },
  "104": { name: "K&H Bank Zrt.", bic: "OKHBHUHB" },
  "107": { name: "CIB Bank Zrt.", bic: "CIBHHUHB" },
  "108": { name: "Citibank Europe plc Magyarországi Fióktelepe", bic: "CITIHUHX" },
  "109": { name: "UniCredit Bank Hungary Zrt.", bic: "BACXHUHB" },
  "116": { name: "Erste Bank Hungary Zrt.", bic: "GIBAHUHB" },
  "117": { name: "OTP Bank Nyrt.", bic: "OTPVHUHB" },
  "120": { name: "Raiffeisen Bank Zrt.", bic: "UBRTHUHB" },
  "121": { name: "Gránit Bank Zrt.", bic: "GNBAHUHB" },
  "128": { name: "Merkantil Bank Zrt.", bic: "MRKBHUHB" },
  "135": { name: "KDB Bank Európa Zrt.", bic: "KODBHUHB" },
  "137": { name: "ING Bank N.V. Magyarországi Fióktelepe", bic: "INGBHUHB" },
  "146": { name: "MFB Magyar Fejlesztési Bank Zrt.", bic: "HBIDHUHB" },
  "148": { name: "Magyar Export-Import Bank Zrt.", bic: "HEXIHUHB" },
  "162": { name: "MagNet Magyar Közösségi Bank Zrt.", bic: "HBWEHUHB" },
  "167": { name: "Magyar Cetelem Bank Zrt.", bic: "MCBHHUHB" },
  "175": { name: "Bank of China Zrt.", bic: "BKCHHUHB" },
  "184": { name: "Oberbank AG Magyarországi Fióktelepe", bic: "OBKLHUHB" },
  "190": { name: "Magyar Nemzeti Bank", bic: "MANEHUHH" },
  "880": { name: "Fundamenta-Lakáskassza Zrt.", bic: "FLTPHUHB" },
  "884": { name: "OTP Jelzálogbank Zrt.", bic: "OTPJHUHB" },
};
