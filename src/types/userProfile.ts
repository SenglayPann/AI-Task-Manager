export interface IUserProfile {
  name: string;
  age?: number;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  career?: string;
  nationality?: string;
}

export const GENDER_OPTIONS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
  { label: 'Prefer not to say', value: 'prefer_not_to_say' },
] as const;

export const CAREER_OPTIONS = [
  'Software Engineer',
  'Product Manager',
  'Designer',
  'Data Scientist',
  'Marketing',
  'Sales',
  'Finance',
  'Healthcare',
  'Education',
  'Legal',
  'Freelancer',
  'Student',
  'Entrepreneur',
  'Other',
];
