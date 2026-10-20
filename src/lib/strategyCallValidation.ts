import { isValidEmail, isValidPhone } from "./leadValidation";

export interface StrategyCallFields {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  careerStage: string;
  notes: string;
}

export const EMPTY_STRATEGY_CALL: StrategyCallFields = {
  firstName: "", lastName: "", email: "", phone: "", careerStage: "", notes: "",
};

export type StrategyCallErrors = Partial<Record<keyof StrategyCallFields, string>>;

/** Same contact validation as the starter API, plus the existing career-stage question. */
export function validateStrategyCall(values: StrategyCallFields): StrategyCallErrors {
  const errors: StrategyCallErrors = {};
  if (!values.firstName.trim() || values.firstName.trim().length > 200) {
    errors.firstName = "Enter your first name.";
  }
  if (!values.lastName.trim() || values.lastName.trim().length > 200) {
    errors.lastName = "Enter your last name.";
  }
  if (!isValidEmail(values.email)) errors.email = "Enter a valid email address.";
  if (!isValidPhone(values.phone)) errors.phone = "Enter a valid 10-digit phone number.";
  if (!values.careerStage) errors.careerStage = "Choose a career stage.";
  return errors;
}
