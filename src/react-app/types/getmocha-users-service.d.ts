import type { MochaUser as BaseMochaUser } from '@getmocha/users-service/shared';

declare module '@getmocha/users-service/shared' {
  interface MochaUser {
    name?: string | null;
    google_user_data: BaseMochaUser['google_user_data'] & {
      name?: string | null;
      given_name?: string | null;
      family_name?: string | null;
      picture?: string | null;
    };
  }
}
