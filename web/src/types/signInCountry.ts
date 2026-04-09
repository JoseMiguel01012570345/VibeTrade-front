/** País habilitado para SMS OTP; coincide con `SignInCountryDto` del API (JSON camelCase). */
export type SignInCountry = {
  name: string;
  code: string;
  dial: string;
  flag: string;
};
