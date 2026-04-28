export interface OnboardingState {
  birthYear: number | null;
  birthMonth: number | null;
  birthDay: number | null;
  birthHour: number | null;
  birthMinute: number | null;
  birthLat: number | null;
  birthLng: number | null;
  birthPlaceName: string | null;
  gender: 'M' | 'F' | null;
}

export const EMPTY_ONBOARDING_STATE: OnboardingState = {
  birthYear: null,
  birthMonth: null,
  birthDay: null,
  birthHour: null,
  birthMinute: null,
  birthLat: null,
  birthLng: null,
  birthPlaceName: null,
  gender: null,
};

export const SESSION_KEY = 'destinos_onboarding';
