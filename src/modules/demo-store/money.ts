import Decimal from "decimal.js";

/** Demo store money is a decimal string with two places (INR). Never use floats. */
export const CURRENCY = "INR";
export const moneyPattern = /^\d{1,9}(\.\d{1,2})?$/;

export function toMoney(value: Decimal.Value) { return new Decimal(value).toFixed(2); }
export function lineTotal(unitPrice: string, quantity: number) { return new Decimal(unitPrice).times(quantity).toFixed(2); }
export function sumMoney(values: string[]) { return values.reduce((sum, value) => sum.plus(value), new Decimal(0)).toFixed(2); }
export function sameMoney(a: string, b: string) { return new Decimal(a).eq(b); }

/** en-IN grouping (12,34,567.00) done on the string so no float rounding is involved. */
export function formatInr(amount: string) {
  const [whole, fraction] = toMoney(amount).split(".");
  const last3 = whole.slice(-3), rest = whole.slice(0, -3);
  const grouped = rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3 : last3;
  return `₹${grouped}.${fraction}`;
}
